'use strict';

/*
 * PHP解析器的步骤：
 * -1. 替换签名和`{{subst:}}`，参见Parser::preSaveTransform；这在revision中不可能保留，可以跳过
 * 0. 移除特定字符`\x00`和`\x7f`，参见Parser::parse
 * 1. 注释/扩展标签（'<'相关），参见Preprocessor_Hash::buildDomTreeArrayFromText和Sanitizer::decodeTagAttributes
 * 2. 模板/模板变量/标题，注意rightmost法则，以及`-{`和`[[`可以破坏`{{`或`{{{`语法，
 *    参见Preprocessor_Hash::buildDomTreeArrayFromText
 * 3. HTML标签（允许不匹配），参见Sanitizer::internalRemoveHtmlTags
 * 4. 表格，参见Parser::handleTables
 * 5. 水平线和状态开关，参见Parser::internalParse
 * 6. 内链，含文件和分类，参见Parser::handleInternalLinks2
 * 7. `'`，参见Parser::doQuotes
 * 8. 外链，参见Parser::handleExternalLinks
 * 9. ISBN、RFC（未来将废弃，不予支持）和自由外链，参见Parser::handleMagicLinks
 * 10. 段落和列表，参见BlockLevelPass::execute
 * 11. 转换，参见LanguageConverter::recursiveConvertTopLevel
 */

/*
 * \x00\d+.\x7f标记Token：
 * e: ExtToken
 * c: CommentToken、NoIncludeToken和IncludeToken
 * !: `{{!}}`专用
 * {: `{{(!}}`专用
 * }: `{{!)}}`专用
 * -: `{{!-}}`专用
 * +: `{{!!}}`专用
 * ~: `{{=}}`专用
 * t: ArgToken或TranscludeToken
 * h: HeadingToken
 * x: HtmlToken
 * b: TableToken
 * r: HrToken
 * u: DoubleUnderscoreToken
 * l: LinkToken
 * q: QuoteToken
 * w: ExtLinkToken
 * d: ListToken
 */

const {externalUse} = require('../util/debug'),
	Ranges = require('../lib/ranges'),
	AstElement = require('../lib/element'),
	assert = require('assert/strict'),
	/** @type {Parser} */ Parser = require('..'),
	{MAX_STAGE} = Parser;

class Token extends AstElement {
	type = 'root';
	/** 解析阶段，参见顶部注释。只对plain Token有意义。 */ #stage = 0;
	/** @type {ParserConfig} */ #config;
	/**
	 * 这个数组起两个作用：1. 数组中的Token会在build时替换`/\x00\d+.\x7f/`标记；2. 数组中的Token会依次执行parseOnce和build方法。
	 * @type {accum}
	 */
	#accum;
	/** @type {Record<string, Ranges>} */ #acceptable;
	#protectedChildren = new Ranges();
	/** @type {boolean} */ #include;

	/**
	 * @param {?string} wikitext
	 * @param {accum} accum
	 * @param {acceptable} acceptable
	 */
	constructor(wikitext, config = Parser.getConfig(), halfParsed = false, accum = [], acceptable = null) {
		super();
		if (typeof wikitext === 'string') {
			this.appendChild(halfParsed ? wikitext : wikitext.replace(/[\x00\x7f]/g, ''));
		}
		this.setAttribute('config', config).setAttribute('accum', accum).setAttribute('acceptable', acceptable);
		accum.push(this);
	}

	/** @complexity `n` */
	cloneChildren() {
		if (!Parser.debugging && externalUse('cloneChildren')) {
			this.debugOnly('cloneChildren');
		}
		return this.childNodes.map(child => typeof child === 'string' ? child : child.cloneNode());
	}

	/** @complexity `n` */
	cloneNode() {
		if (!this.isPlain()) {
			throw new Error(`未定义 ${this.constructor.name} 的复制方法！`);
		}
		const cloned = this.cloneChildren();
		return Parser.run(() => {
			const token = new Token(undefined, this.#config, false, [], this.#acceptable);
			token.type = this.type;
			token.append(...cloned);
			token.protectChildren(...this.#protectedChildren);
			return token;
		});
	}

	/**
	 * @template {string} T
	 * @param {T} key
	 * @returns {TokenAttribute<T>}
	 */
	getAttribute(key) {
		switch (key) {
			case 'stage':
				return this.#stage;
			case 'config':
				return structuredClone(this.#config);
			case 'accum':
				return this.#accum;
			case 'acceptable':
				return this.#acceptable ? {...this.#acceptable} : null;
			case 'protectedChildren':
				return new Ranges(this.#protectedChildren);
			case 'include': {
				if (this.#include !== undefined) {
					return this.#include;
				}
				const includeToken = this.querySelector('include');
				if (includeToken) {
					return includeToken.name === 'noinclude';
				}
				const noincludeToken = this.querySelector('noinclude');
				return Boolean(noincludeToken) && !/^<\/?noinclude(?:\s[^>]*)?\/?>$/i.test(noincludeToken.toString());
			}
			default:
				return super.getAttribute(key);
		}
	}

	/**
	 * @template {string} T
	 * @param {T} key
	 * @param {TokenAttribute<T>} value
	 */
	setAttribute(key, value) {
		if (key === 'include' || !Parser.running && ['config', 'accum'].includes(key)) {
			throw new RangeError(`禁止手动指定私有的 #${key} 属性！`);
		} else if (!Parser.debugging && ['stage', 'acceptable', 'protectedChildren'].includes(key)
			&& externalUse('setAttribute')
		) {
			throw new RangeError(`使用 ${this.constructor.name}.setAttribute 方法设置私有属性 #${key} 仅用于代码调试！`);
		}
		switch (key) {
			case 'stage':
				if (this.#stage === 0 && this.type === 'root') {
					this.#accum.shift();
				}
				this.#stage = value;
				return this;
			case 'config':
				this.#config = value;
				return this;
			case 'accum':
				this.#accum = value;
				return this;
			case 'protectedChildren':
				this.#protectedChildren = value;
				return this;
			case 'acceptable': {
				const /** @type {acceptable} */ acceptable = {};
				if (value) {
					for (const [k, v] of Object.entries(value)) {
						if (k.startsWith('Stage-')) {
							for (let i = 0; i <= Number(k.slice(6)); i++) {
								for (const type of Parser.aliases[i]) {
									acceptable[type] = new Ranges(v);
								}
							}
						} else if (k.startsWith('!')) { // `!`项必须放在最后
							delete acceptable[k.slice(1)];
						} else {
							acceptable[k] = new Ranges(v);
						}
					}
				}
				this.#acceptable = value && acceptable;
				return this;
			}
			default:
				return super.setAttribute(key, value);
		}
	}

	isPlain() {
		return this.constructor === Token;
	}

	/** @param {...string|number|Range} args */
	protectChildren(...args) {
		if (!Parser.debugging && externalUse('protectChildren')) {
			this.debugOnly('protectChildren');
		}
		this.#protectedChildren.push(...new Ranges(args));
	}

	/**
	 * @param {number} i
	 * @returns {string|Token}
	 * @complexity `n`
	 */
	removeAt(i) {
		if (!Parser.running) {
			const protectedIndices = this.#protectedChildren.applyTo(this.childNodes);
			if (protectedIndices.includes(i)) {
				throw new Error(`${this.constructor.name} 的第 ${i} 个子节点不可移除！`);
			} else if (this.#acceptable) {
				const acceptableIndices = Object.fromEntries(
						Object.entries(this.#acceptable)
							.map(([str, ranges]) => [str, ranges.applyTo(this.childNodes.length - 1)]),
					),
					nodesAfter = i === -1 ? [] : this.childNodes.slice(i + 1);
				if (nodesAfter.some(({constructor: {name}}, j) => !acceptableIndices[name].includes(i + j))) {
					throw new Error(`移除 ${this.constructor.name} 的第 ${i} 个子节点会破坏规定的顺序！`);
				}
			}
		}
		return super.removeAt(i);
	}

	/**
	 * @template {string|Token} T
	 * @param {T} token
	 * @complexity `n`
	 */
	insertAt(token, i = this.childNodes.length) {
		if (!Parser.running && this.#acceptable) {
			const acceptableIndices = Object.fromEntries(
					Object.entries(this.#acceptable)
						.map(([str, ranges]) => [str, ranges.applyTo(this.childNodes.length + 1)]),
				),
				nodesAfter = this.childNodes.slice(i),
				insertedName = token.constructor.name,
				k = i < 0 ? i + this.childNodes.length : i;
			if (!acceptableIndices[insertedName].includes(k)) {
				throw new RangeError(`${this.constructor.name} 的第 ${k} 个子节点不能为 ${insertedName}！`);
			} else if (nodesAfter.some(({constructor: {name}}, j) => !acceptableIndices[name].includes(k + j + 1))) {
				throw new Error(`${this.constructor.name} 插入新的第 ${k} 个子节点会破坏规定的顺序！`);
			}
		}
		super.insertAt(token, i);
		if (token instanceof Token && token.type === 'root') {
			token.type = 'plain';
		}
		return token;
	}

	/**
	 * @param {Token} token
	 * @complexity `n`
	 */
	safeReplaceWith(token) {
		const {parentNode} = this;
		if (!parentNode) {
			throw new Error('不存在父节点！');
		} else if (token.constructor !== this.constructor) {
			this.typeError('safeReplaceWith', this.constructor.name);
		}
		try {
			assert.deepEqual(token.getAttribute('acceptable'), this.#acceptable);
		} catch (e) {
			if (e instanceof assert.AssertionError) {
				throw new Error(`待替换的 ${this.constructor.name} 带有不同的 #acceptable 属性！`);
			}
			throw e;
		}
		const i = parentNode.childNodes.indexOf(this);
		super.removeAt.call(parentNode, i);
		super.insertAt.call(parentNode, token, i);
		if (token.type === 'root') {
			token.type = 'plain';
		}
		const e = new Event('replace', {bubbles: true});
		token.dispatchEvent(e, {position: i, oldToken: this, newToken: token});
	}

	/** @param {string} title */
	isInterwiki(title) {
		return Parser.isInterwiki(title, this.#config);
	}

	/** @param {string} title */
	normalizeTitle(title, defaultNs = 0, halfParsed = false) {
		return Parser.normalizeTitle(title, defaultNs, this.#include, this.#config, halfParsed);
	}

	/** @complexity `n` */
	sections() {
		if (this.type !== 'root') {
			return;
		}
		const {childNodes} = this,
			headings = [...childNodes.entries()]
				.filter(([, child]) => child instanceof Token && child.type === 'heading')
				.map(/** @param {[number, Token]} */ ([i, {name}]) => [i, Number(name)]),
			lastHeading = [-1, -1, -1, -1, -1, -1];
		const /** @type {(string|Token)[][]} */ sections = new Array(headings.length);
		for (const [i, [index, level]] of headings.entries()) {
			for (let j = level; j < 6; j++) {
				const last = lastHeading[j];
				if (last >= 0) {
					sections[last] = childNodes.slice(headings[last][0], index);
				}
				lastHeading[j] = j === level ? i : -1;
			}
		}
		for (const last of lastHeading) {
			if (last >= 0) {
				sections[last] = childNodes.slice(headings[last][0]);
			}
		}
		sections.unshift(childNodes.slice(0, headings[0]?.[0]));
		return sections;
	}

	/**
	 * @param {number} n
	 * @complexity `n`
	 */
	section(n) {
		if (typeof n !== 'number') {
			this.typeError('section', 'Number');
		}
		return this.sections()[n];
	}

	/**
	 * @param {string|undefined} tag
	 * @returns {[Token, Token]}
	 * @complexity `n`
	 */
	findEnclosingHtml(tag) {
		if (tag !== undefined && typeof tag !== 'string') {
			this.typeError('findEnclosingHtml', 'String');
		}
		tag = tag?.toLowerCase();
		if (tag !== undefined && !this.#config.html.slice(0, 2).flat().includes(tag)) {
			throw new RangeError(`非法的标签或空标签：${tag}`);
		}
		const {parentElement} = this;
		if (!parentElement) {
			return;
		}
		const {children} = parentElement,
			index = children.indexOf(this);
		let i;
		for (i = index - 1; i >= 0; i--) {
			if (children[i].matches(`html${tag && '#'}${tag ?? ''}[selfClosing=false][closing=false]`)) {
				break;
			}
		}
		if (i === -1) {
			return parentElement.findEnclosingHtml(tag);
		}
		const opening = children[i],
			{name} = opening;
		for (i = index + 1; i < children.length; i++) {
			if (children[i].matches(`html#${name}[selfClosing=false][closing=true]`)) {
				break;
			}
		}
		return i === children.length
			? parentElement.findEnclosingHtml(tag)
			: [opening, children[i]];
	}

	/** @complexity `n` */
	getCategories() {
		return this.querySelectorAll('category').map(({name, sortkey}) => [name, sortkey]);
	}

	redoQuotes() {
		const acceptable = this.getAttribute('acceptable');
		if (acceptable && !acceptable.QuoteToken?.some(
			range => typeof range !== 'number' && range.start === 0 && range.end === Infinity && range.step === 1,
		)) {
			throw new Error(`${this.constructor.name} 不接受 QuoteToken 作为子节点！`);
		}
		for (const quote of this.childNodes) {
			if (quote instanceof Token && quote.type === 'quote') {
				quote.replaceWith(quote.firstChild);
			}
		}
		this.normalize();
		/** @type {[number, string][]} */
		const textNodes = [...this.childNodes.entries()].filter(([, child]) => typeof child === 'string'),
			indices = textNodes.map(([i]) => this.getRelativeIndex(i)),
			token = Parser.run(() => {
				const root = new Token(textNodes.map(([, str]) => str).join(''), this.getAttribute('config'));
				return root.setAttribute('stage', 6).parse(7);
			});
		for (const quote of token.children.reverse()) {
			if (quote.type === 'quote') {
				const index = quote.getRelativeIndex(),
					n = indices.findLastIndex(textIndex => textIndex <= index);
				this.splitText(n, index - indices[n]);
				this.splitText(n + 1, Number(quote.name));
				this.removeAt(n + 1);
				this.insertAt(quote, n + 1);
			}
		}
		this.normalize();
	}

	/**
	 * 将维基语法替换为占位符
	 * @this {Token & {firstChild: string}}
	 */
	parseOnce(n = this.#stage, include = false) {
		if (!Parser.debugging && externalUse('parseOnce')) {
			this.debugOnly('parseOnce');
		} else if (n < this.#stage || !this.isPlain() || this.childNodes.length === 0) {
			return this;
		}
		switch (n) {
			case 0:
				if (this.type === 'root') {
					this.#accum.shift();
				}
				this.#parseCommentAndExt(include);
				break;
			case 1:
				this.#parseBrackets();
				break;
			case 2:
				this.#parseHtml();
				break;
			case 3:
				this.#parseTable();
				break;
			case 4:
				this.#parseHrAndDoubleUndescore();
				break;
			case 5:
				this.#parseLinks();
				break;
			case 6: {
				this.#parseQuotes();
				break;
			}
			case 7:
				this.#parseExternalLinks();
				break;
			case 8:
				this.#parseMagicLinks();
				break;
			case 9:
				this.#parseList();
				break;
			case 10:
				// no default
		}
		if (this.type === 'root') {
			for (const token of this.#accum) {
				token.parseOnce(n, include);
			}
		}
		this.#stage++;
		return this;
	}

	/**
	 * @param {string} str
	 * @complexity `n`
	 */
	buildFromStr(str) {
		if (!Parser.debugging && externalUse('buildFromStr')) {
			this.debugOnly('buildFromStr');
		}
		return str.split(/[\x00\x7f]/).map((s, i) => {
			if (i % 2 === 0) {
				return s;
			} else if (!isNaN(s.at(-1))) {
				throw new Error(`解析错误！未正确标记的 Token：${s}`);
			}
			return this.#accum[Number(s.slice(0, -1))];
		});
	}

	/**
	 * 将占位符替换为子Token
	 * @complexity `n`
	 */
	build() {
		if (!Parser.debugging && externalUse('build')) {
			this.debugOnly('build');
		}
		this.#stage = MAX_STAGE;
		const {childNodes: {length}, firstChild} = this;
		if (length !== 1 || typeof firstChild !== 'string' || !firstChild.includes('\x00')) {
			return this;
		}
		this.replaceChildren(...this.buildFromStr(firstChild));
		this.normalize();
		if (this.type === 'root') {
			for (const token of this.#accum) {
				token.build();
			}
		}
		return this;
	}

	/** 生成部分Token的`name`属性 */
	afterBuild() {
		if (!Parser.debugging && externalUse('afterBuild')) {
			this.debugOnly('afterBuild');
		} else if (this.type === 'root') {
			for (const token of this.#accum) {
				token.afterBuild();
			}
		}
		return this;
	}

	/** 解析、重构、生成部分Token的`name`属性 */
	parse(n = MAX_STAGE, include = false) {
		if (typeof n !== 'number') {
			this.typeError('parse', 'Number');
		} else if (n < MAX_STAGE && !Parser.debugging && externalUse('parse')) {
			Parser.warn('指定解析层级的方法仅供熟练用户使用！');
		}
		this.#include = Boolean(include);
		while (this.#stage < n) {
			this.parseOnce(this.#stage, include);
		}
		return n ? this.build().afterBuild() : this;
	}

	/** @this {Token & {firstChild: string}} */
	#parseCommentAndExt(includeOnly = false) {
		const parseCommentAndExt = require('../parser/commentAndExt');
		this.setText(parseCommentAndExt(this.firstChild, this.#config, this.#accum, includeOnly));
	}

	/** @this {Token & {firstChild: string}} */
	#parseBrackets() {
		const parseBrackets = require('../parser/brackets');
		this.setText(parseBrackets(this.firstChild, this.#config, this.#accum));
	}

	/** @this {Token & {firstChild: string}} */
	#parseHtml() {
		const parseHtml = require('../parser/html');
		this.setText(parseHtml(this.firstChild, this.#config, this.#accum));
	}

	/** @this {Token & {firstChild: string}} */
	#parseTable() {
		const parseTable = require('../parser/table'),
			TableToken = require('./table');
		this.setText(parseTable(this, this.#config, this.#accum));
		for (const table of this.#accum) {
			if (table instanceof TableToken && table.type !== 'td') {
				table.normalize();
				const [, child] = table.childNodes;
				if (typeof child === 'string' && child.includes('\x00')) {
					table.removeAt(1);
					const inner = new Token(child, this.#config, true, this.#accum);
					table.insertAt(inner, 1);
					inner.setAttribute('stage', 4);
				}
			}
		}
	}

	/** @this {Token & {firstChild: string}} */
	#parseHrAndDoubleUndescore() {
		const parseHrAndDoubleUnderscore = require('../parser/hrAndDoubleUnderscore');
		this.setText(parseHrAndDoubleUnderscore(this.firstChild, this.#config, this.#accum));
	}

	/** @this {Token & {firstChild: string}} */
	#parseLinks() {
		const parseLinks = require('../parser/links');
		this.setText(parseLinks(this.firstChild, this.#config, this.#accum));
	}

	/** @this {Token & {firstChild: string}} */
	#parseQuotes() {
		const parseQuotes = require('../parser/quotes'),
			lines = this.firstChild.split('\n');
		for (let i = 0; i < lines.length; i++) {
			lines[i] = parseQuotes(lines[i], this.#config, this.#accum);
		}
		this.setText(lines.join('\n'));
	}

	/** @this {Token & {firstChild: string}} */
	#parseExternalLinks() {
		const parseExternalLinks = require('../parser/externalLinks');
		this.setText(parseExternalLinks(this.firstChild, this.#config, this.#accum));
	}

	/** @this {Token & {firstChild: string}} */
	#parseMagicLinks() {
		const parseMagicLinks = require('../parser/magicLinks');
		this.setText(parseMagicLinks(this.firstChild, this.#config, this.#accum));
	}

	#parseList() {
		const parseList = require('../parser/list'),
			lines = this.firstChild.split('\n');
		for (let i = 0; i < lines.length; i++) {
			lines[i] = parseList(lines[i], this.#config, this.#accum);
		}
		this.setText(lines.join('\n'));
	}
}

Parser.classes.Token = __filename;
module.exports = Token;
