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
 */

const {typeError, externalUse} = require('../util/debug'),
	{ucfirst} = require('../util/string'),
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

	cloneChildren() {
		if (!Parser.debugging && externalUse('cloneChildren')) {
			this.debugOnly('cloneChildren');
		}
		return this.childNodes.map(child => typeof child === 'string' ? child : child.cloneNode());
	}

	cloneNode() {
		if (!this.isPlain()) {
			throw new Error(`未定义 ${this.constructor.name} 的复制方法！`);
		}
		const cloned = this.cloneChildren();
		Parser.running = true;
		const token = new Token(undefined, this.#config, false, [], this.#acceptable);
		token.type = this.type;
		token.append(...cloned);
		token.protectChildren(...this.#protectedChildren);
		Parser.running = false;
		return token;
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
			case 'include':
				return this.#include;
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
	 */
	removeAt(i) {
		const protectedIndices = this.#protectedChildren.applyTo(this.childNodes);
		if (protectedIndices.includes(i)) {
			throw new Error(`${this.constructor.name} 的第 ${i} 个子节点不可移除！`);
		} else if (this.#acceptable) {
			const acceptableIndices = Object.fromEntries(
					Object.entries(this.#acceptable).map(([str, ranges]) => [str, ranges.applyTo(this.childNodes)]),
				),
				nodesAfter = this.childNodes.slice(i + 1);
			if (nodesAfter.some(({constructor: {name}}, j) => !acceptableIndices[name].includes(i + j))) {
				throw new Error(`移除 ${this.constructor.name} 的第 ${i} 个子节点会破坏规定的顺序！`);
			}
		}
		return super.removeAt(i);
	}

	/**
	 * @template {string|Token} T
	 * @param {T} token
	 */
	insertAt(token, i = this.childNodes.length) {
		if (this.#acceptable) {
			const acceptableIndices = Object.fromEntries(
					Object.entries(this.#acceptable)
						.map(([str, ranges]) => [str, ranges.applyTo(this.childNodes.length + 1)]),
				),
				nodesAfter = this.childNodes.slice(i),
				insertedName = token.constructor.name;
			if (!acceptableIndices[insertedName].includes(i)) {
				throw new RangeError(`${this.constructor.name} 的第 ${i} 个子节点不能为 ${insertedName}！`);
			} else if (nodesAfter.some(({constructor: {name}}, j) => !acceptableIndices[name].includes(i + j + 1))) {
				throw new Error(`${this.constructor.name} 插入新的第 ${i} 个子节点会破坏规定的顺序！`);
			}
		}
		super.insertAt(token, i);
		if (token instanceof Token && token.type === 'root') {
			token.type = 'plain';
		}
		return token;
	}

	/** @param {Token} token */
	safeReplaceWith(token) {
		const {parentNode} = this;
		if (!parentNode) {
			throw new Error('不存在父节点！');
		} else if (token.constructor !== this.constructor) {
			typeError(this.constructor.name);
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
		if (typeof title !== 'string') {
			typeError(this, 'isInterwiki', 'String');
		}
		return title.replaceAll('_', ' ').replace(/^\s*:?\s*/, '')
			.match(new RegExp(`^(${this.#config.interwiki.join('|')})\\s*:`, 'i'));
	}

	/**
	 * 引自mediawiki.Title::parse
	 * @param {string} title
	 */
	normalizeTitle(title, defaultNs = 0) {
		if (typeof title !== 'string' || typeof defaultNs !== 'number') {
			typeError(this, 'normalizeTitle', 'String', 'Number');
		}
		const {namespaces, nsid} = this.#config;
		let namespace = namespaces[defaultNs];
		title = title.replaceAll('_', ' ').trim();
		if (title[0] === ':') {
			namespace = '';
			title = title.slice(1).trim();
		}
		const iw = this.isInterwiki(title);
		if (iw) {
			title = title.slice(iw[0].length);
		}
		const m = title.split(':');
		if (m.length > 1) {
			const id = namespaces[nsid[m[0].trim().toLowerCase()]];
			if (id !== undefined) {
				namespace = id;
				title = m.slice(1).join(':').trim();
			}
		}
		const i = title.indexOf('#');
		title = i === -1 ? title : title.slice(0, i).trim();
		return `${iw ? `${iw[1].toLowerCase()}:` : ''}${namespace}${namespace && ':'}${ucfirst(title)}`;
	}

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

	/** @param {number} n */
	section(n) {
		if (typeof n !== 'number') {
			typeError(this, 'section', 'Number');
		}
		return this.sections()[n];
	}

	getCategories() {
		return this.querySelectorAll('category').map(({name, sortkey}) => [name, sortkey]);
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
				const lines = this.firstChild.split('\n');
				for (let i = 0; i < lines.length; i++) {
					lines[i] = this.#parseQuotes(lines[i]);
				}
				this.setText(lines.join('\n'));
				break;
			}
			case 7:
				this.#parseExternalLinks();
				break;
			case 8:
				this.#parseMagicLinks();
				break;
			case 9:
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

	/** @param {string} str */
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

	/** 将占位符替换为子Token */
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
			typeError(this, 'parse', 'Number');
		} else if (n < MAX_STAGE && !Parser.debugging && externalUse('parse')) {
			Parser.warn('指定解析层级的方法仅供熟练用户使用！');
		}
		this.#include = Boolean(include);
		while (this.#stage < n) {
			this.parseOnce(this.#stage, include);
		}
		return this.build().afterBuild();
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
			TableToken = require('./tableToken');
		this.setText(parseTable(this.firstChild, this.#config, this.#accum));
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
		this.setText(parseLinks(this, this.#config, this.#accum));
	}

	/** @param {string} text */
	#parseQuotes(text) {
		const parseQuotes = require('../parser/quotes');
		return parseQuotes(text, this.#accum);
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
}

Parser.classes.Token = __filename;
module.exports = Token;
