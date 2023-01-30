'use strict';

/*
 * PHP解析器的步骤：
 * -1. 替换签名和`{{subst:}}`，参见Parser::preSaveTransform；这在revision中不可能保留，可以跳过
 * 0. 移除特定字符`\0`和`\x7F`，参见Parser::parse
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
 * \0\d+.\x7F标记Token：
 * e: ExtToken
 * a: AttributeToken
 * c: CommentToken、NoIncludeToken和IncludeToken
 * !: `{{!}}`专用
 * {: `{{(!}}`专用
 * }: `{{!)}}`专用
 * -: `{{!-}}`专用
 * +: `{{!!}}`专用
 * ~: `{{=}}`专用
 * m: `{{fullurl:}}`、`{{canonicalurl:}}`或`{{filepath:}}`
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
 * v: ConverterToken
 */

const {text} = require('../util/string'),
	{externalUse} = require('../util/debug'),
	assert = require('assert/strict'),
	Ranges = require('../lib/ranges'),
	Parser = require('..'),
	AstElement = require('../lib/element'),
	AstText = require('../lib/text');
const {MAX_STAGE, aliases} = Parser;

/**
 * 所有节点的基类
 * @classdesc `{childNodes: ...(AstText|Token)}`
 */
class Token extends AstElement {
	type = 'root';
	#stage = 0; // 解析阶段，参见顶部注释。只对plain Token有意义。
	#config;
	// 这个数组起两个作用：1. 数组中的Token会在build时替换`/\0\d+.\x7F/`标记；2. 数组中的Token会依次执行parseOnce和build方法。
	#accum;
	/** @type {boolean} */ #include;
	/** @type {Record<string, Ranges>} */ #acceptable;
	#protectedChildren = new Ranges();

	/**
	 * 将维基语法替换为占位符
	 * @param {number} n 解析阶段
	 * @param {boolean} include 是否嵌入
	 */
	#parseOnce = (n = this.#stage, include = false) => {
		if (n < this.#stage || !this.isPlain() || this.length === 0) {
			return this;
		}
		switch (n) {
			case 0:
				if (this.type === 'root') {
					this.#accum.shift();
				}
				this.#include = Boolean(include);
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
			case 6:
				this.#parseQuotes();
				break;

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
				this.#parseConverter();
				// no default
		}
		if (this.type === 'root') {
			for (const token of this.#accum) {
				token.getAttribute('parseOnce')(n, include);
			}
		}
		this.#stage++;
		return this;
	};

	/**
	 * 重建wikitext
	 * @template {string} T
	 * @param {string} str 半解析的字符串
	 * @param {T} type 返回类型
	 * @complexity `n`
	 * @returns {T extends 'string|text' ? string : (Token|AstText)[]}
	 */
	#buildFromStr = (str, type) => {
		const nodes = str.split(/[\0\x7F]/u).map((s, i) => {
			if (i % 2 === 0) {
				return new AstText(s, this.#config);
			} else if (isNaN(s.at(-1))) {
				return this.#accum[Number(s.slice(0, -1))];
			}
			throw new Error(`解析错误！未正确标记的 Token：${s}`);
		});
		if (type === 'string') {
			return nodes.map(String).join('');
		} else if (type === 'text') {
			return text(nodes);
		}
		return nodes;
	};

	/**
	 * 将占位符替换为子Token
	 * @complexity `n`
	 */
	#build = () => {
		this.#stage = MAX_STAGE;
		const {length, firstChild} = this,
			str = String(firstChild);
		if (length === 1 && firstChild.type === 'text' && str.includes('\0')) {
			this.replaceChildren(...this.#buildFromStr(str));
			this.normalize();
			if (this.type === 'root') {
				for (const token of this.#accum) {
					token.getAttribute('build')();
				}
			}
		}
	};

	/**
	 * 保护部分子节点不被移除
	 * @param {...string|number|Range} args 子节点范围
	 */
	#protectChildren = (...args) => {
		this.#protectedChildren.push(...new Ranges(args));
	};

	/** 所有图片，包括图库 */
	get images() {
		return this.querySelectorAll('file, gallery-image, imagemap-image');
	}

	/** 所有内链、外链和自由外链 */
	get links() {
		return this.querySelectorAll('link, ext-link, free-ext-link, image-parameter#link');
	}

	/** 所有模板和模块 */
	get embeds() {
		return this.querySelectorAll('template, magic-word#invoke');
	}

	/**
	 * @param {string} wikitext wikitext
	 * @param {accum} accum
	 * @param {acceptable} acceptable 可接受的子节点设置
	 */
	constructor(wikitext, config = Parser.getConfig(), halfParsed = false, accum = [], acceptable = undefined) {
		super();
		if (typeof wikitext === 'string') {
			this.insertAt(halfParsed ? wikitext : wikitext.replace(/[\0\x7F]/gu, ''));
		}
		this.#config = config;
		this.#accum = accum;
		this.setAttribute('acceptable', acceptable);
		accum.push(this);
	}

	/**
	 * @override
	 * @template {string} T
	 * @param {T} key 属性键
	 * @returns {TokenAttribute<T>}
	 */
	getAttribute(key) {
		switch (key) {
			case 'config':
				return structuredClone(this.#config);
			case 'accum':
				return this.#accum;
			case 'parseOnce':
				return this.#parseOnce;
			case 'buildFromStr':
				return this.#buildFromStr;
			case 'build':
				return this.#build;
			case 'include': {
				if (this.#include !== undefined) {
					return this.#include;
				}
				const root = this.getRootNode();
				if (root.type === 'root' && root !== this) {
					return root.getAttribute('include');
				}
				const includeToken = root.querySelector('include');
				if (includeToken) {
					return includeToken.name === 'noinclude';
				}
				const noincludeToken = root.querySelector('noinclude');
				return Boolean(noincludeToken) && !/^<\/?noinclude(?:\s[^>]*)?\/?>$/iu.test(String(noincludeToken));
			}
			case 'stage':
				return this.#stage;
			case 'acceptable':
				return this.#acceptable ? {...this.#acceptable} : undefined;
			case 'protectChildren':
				return this.#protectChildren;
			case 'protectedChildren':
				return new Ranges(this.#protectedChildren);
			default:
				return super.getAttribute(key);
		}
	}

	/**
	 * @override
	 * @template {string} T
	 * @param {T} key 属性键
	 * @param {TokenAttribute<T>} value 属性值
	 */
	setAttribute(key, value) {
		switch (key) {
			case 'stage':
				if (this.#stage === 0 && this.type === 'root') {
					this.#accum.shift();
				}
				this.#stage = value;
				return this;
			case 'acceptable': {
				const /** @type {acceptable} */ acceptable = {};
				if (value) {
					for (const [k, v] of Object.entries(value)) {
						if (k.startsWith('Stage-')) {
							for (let i = 0; i <= Number(k.slice(6)); i++) {
								for (const type of aliases[i]) {
									acceptable[type] = new Ranges(v);
								}
							}
						} else if (k[0] === '!') { // `!`项必须放在最后
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

	/** 是否是普通节点 */
	isPlain() {
		return this.constructor === Token;
	}

	/**
	 * @override
	 * @template {string|Token} T
	 * @param {T} token 待插入的子节点
	 * @param {number} i 插入位置
	 * @complexity `n`
	 * @returns {T extends Token ? Token : AstText}
	 * @throws `RangeError` 不可插入的子节点
	 */
	insertAt(token, i = this.length) {
		if (typeof token === 'string') {
			token = new AstText(token, this.#config);
		}
		if (!Parser.running && this.#acceptable) {
			const acceptableIndices = Object.fromEntries(
					Object.entries(this.#acceptable)
						.map(([str, ranges]) => [str, ranges.applyTo(this.length + 1)]),
				),
				nodesAfter = this.childNodes.slice(i),
				{constructor: {name: insertedName}} = token,
				k = i < 0 ? i + this.length : i;
			if (!acceptableIndices[insertedName].includes(k)) {
				throw new RangeError(`${this.constructor.name} 的第 ${k} 个子节点不能为 ${insertedName}！`);
			} else if (nodesAfter.some(({constructor: {name}}, j) => !acceptableIndices[name].includes(k + j + 1))) {
				throw new Error(`${this.constructor.name} 插入新的第 ${k} 个子节点会破坏规定的顺序！`);
			}
		}
		super.insertAt(token, i);
		if (token.type === 'root') {
			token.type = 'plain';
		}
		return token;
	}

	/**
	 * 规范化页面标题
	 * @param {string} title 标题（含或不含命名空间前缀）
	 * @param {number} defaultNs 命名空间
	 * @param {boolean} decode 是否需要解码
	 */
	normalizeTitle(title, defaultNs = 0, halfParsed = false, decode = false) {
		return Parser.normalizeTitle(title, defaultNs, this.#include, this.#config, halfParsed, decode);
	}

	/**
	 * @override
	 * @param {number} i 移除位置
	 * @returns {Token}
	 * @complexity `n`
	 * @throws `Error` 不可移除的子节点
	 */
	removeAt(i) {
		if (!Number.isInteger(i)) {
			this.typeError('removeAt', 'Number');
		}
		const iPos = i < 0 ? i + this.length : i;
		if (!Parser.running) {
			const protectedIndices = this.#protectedChildren.applyTo(this.childNodes);
			if (protectedIndices.includes(iPos)) {
				throw new Error(`${this.constructor.name} 的第 ${i} 个子节点不可移除！`);
			} else if (this.#acceptable) {
				const acceptableIndices = Object.fromEntries(
						Object.entries(this.#acceptable)
							.map(([str, ranges]) => [str, ranges.applyTo(this.length - 1)]),
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
	 * 替换为同类节点
	 * @param {Token} token 待替换的节点
	 * @complexity `n`
	 * @throws `Error` 不存在父节点
	 * @throws `Error` 待替换的节点具有不同属性
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

	/**
	 * 创建HTML注释
	 * @param {string} data 注释内容
	 */
	createComment(data = '') {
		if (typeof data === 'string') {
			const CommentToken = require('./nowiki/comment');
			const config = this.getAttribute('config');
			return Parser.run(() => new CommentToken(data.replaceAll('-->', '--&gt;'), true, config));
		}
		return this.typeError('createComment', 'String');
	}

	/**
	 * 创建标签
	 * @param {string} tagName 标签名
	 * @param {{selfClosing: boolean, closing: boolean}} options 选项
	 * @throws `RangeError` 非法的标签名
	 */
	createElement(tagName, {selfClosing, closing} = {}) {
		if (typeof tagName !== 'string') {
			this.typeError('createElement', 'String');
		}
		const config = this.getAttribute('config'),
			include = this.getAttribute('include');
		if (tagName === (include ? 'noinclude' : 'includeonly')) {
			const IncludeToken = require('./tagPair/include');
			return Parser.run(
				() => new IncludeToken(tagName, '', undefined, selfClosing ? undefined : tagName, config),
			);
		} else if (config.ext.includes(tagName)) {
			const ExtToken = require('./tagPair/ext');
			return Parser.run(() => new ExtToken(tagName, '', '', selfClosing ? undefined : '', config));
		} else if (config.html.flat().includes(tagName)) {
			const HtmlToken = require('./html');
			return Parser.run(() => new HtmlToken(tagName, '', closing, selfClosing, config));
		}
		throw new RangeError(`非法的标签名！${tagName}`);
	}

	/**
	 * 创建纯文本节点
	 * @param {string} data 文本内容
	 */
	createTextNode(data = '') {
		return typeof data === 'string' ? new AstText(data, this.#config) : this.typeError('createComment', 'String');
	}

	/**
	 * 找到给定位置所在的节点
	 * @param {number} index 位置
	 */
	caretPositionFromIndex(index) {
		if (index === undefined) {
			return undefined;
		} else if (!Number.isInteger(index)) {
			this.typeError('caretPositionFromIndex', 'Number');
		}
		const {length} = String(this);
		if (index > length || index < -length) {
			return undefined;
		} else if (index < 0) {
			index += length;
		}
		let child = this, // eslint-disable-line unicorn/no-this-assignment
			acc = 0,
			start = 0;
		while (child.type !== 'text') {
			const {childNodes} = child;
			acc += child.getPadding();
			for (let i = 0; acc <= index && i < childNodes.length; i++) {
				const cur = childNodes[i],
					{length: l} = String(cur);
				acc += l;
				if (acc >= index) {
					child = cur;
					acc -= l;
					start = acc;
					break;
				}
				acc += child.getGaps(i);
			}
			if (child.childNodes === childNodes) {
				return {offsetNode: child, offset: index - start};
			}
		}
		return {offsetNode: child, offset: index - start};
	}

	/**
	 * 找到给定位置所在的节点
	 * @param {number} x 列数
	 * @param {number} y 行数
	 */
	caretPositionFromPoint(x, y) {
		return this.caretPositionFromIndex(this.indexFromPos(y, x));
	}

	/**
	 * 找到给定位置所在的最外层节点
	 * @param {number} index 位置
	 * @throws `Error` 不是根节点
	 */
	elementFromIndex(index) {
		if (index === undefined) {
			return undefined;
		} else if (!Number.isInteger(index)) {
			this.typeError('elementFromIndex', 'Number');
		} else if (this.type !== 'root') {
			throw new Error('elementFromIndex方法只可用于根节点！');
		}
		const {length} = String(this);
		if (index > length || index < -length) {
			return undefined;
		} else if (index < 0) {
			index += length;
		}
		const {childNodes} = this;
		let acc = 0,
			i = 0;
		for (; acc < index && i < childNodes.length; i++) {
			const {length: l} = String(childNodes[i]);
			acc += l;
		}
		return childNodes[i && i - 1];
	}

	/**
	 * 找到给定位置所在的最外层节点
	 * @param {number} x 列数
	 * @param {number} y 行数
	 */
	elementFromPoint(x, y) {
		return this.elementFromIndex(this.indexFromPos(y, x));
	}

	/**
	 * 找到给定位置所在的所有节点
	 * @param {number} index 位置
	 */
	elementsFromIndex(index) {
		const offsetNode = this.caretPositionFromIndex(index)?.offsetNode;
		return offsetNode && [...offsetNode.getAncestors().reverse(), offsetNode];
	}

	/**
	 * 找到给定位置所在的所有节点
	 * @param {number} x 列数
	 * @param {number} y 行数
	 */
	elementsFromPoint(x, y) {
		return this.elementsFromIndex(this.indexFromPos(y, x));
	}

	/**
	 * 判断标题是否是跨维基链接
	 * @param {string} title 标题
	 */
	isInterwiki(title) {
		return Parser.isInterwiki(title, this.#config);
	}

	/**
	 * 深拷贝所有子节点
	 * @complexity `n`
	 * @returns {(AstText|Token)[]}
	 */
	cloneChildNodes() {
		return this.childNodes.map(child => child.cloneNode());
	}

	/**
	 * 深拷贝节点
	 * @complexity `n`
	 * @throws `Error` 未定义复制方法
	 */
	cloneNode() {
		if (this.constructor !== Token) {
			throw new Error(`未定义 ${this.constructor.name} 的复制方法！`);
		}
		const cloned = this.cloneChildNodes();
		return Parser.run(() => {
			const token = new Token(undefined, this.#config, false, [], this.#acceptable);
			token.type = this.type;
			token.append(...cloned);
			token.getAttribute('protectChildren')(...this.#protectedChildren);
			return token;
		});
	}

	/**
	 * 获取全部章节
	 * @complexity `n`
	 */
	sections() {
		if (this.type !== 'root') {
			return undefined;
		}
		const {childNodes} = this,
			headings = [...childNodes.entries()].filter(([, {type}]) => type === 'heading')
				.map(([i, {name}]) => [i, Number(name)]),
			lastHeading = [-1, -1, -1, -1, -1, -1],
			/** @type {(AstText|Token)[][]} */ sections = new Array(headings.length);
		for (let i = 0; i < headings.length; i++) {
			const [index, level] = headings[i];
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
	 * 获取指定章节
	 * @param {number} n 章节序号
	 * @complexity `n`
	 */
	section(n) {
		return Number.isInteger(n) ? this.sections()?.[n] : this.typeError('section', 'Number');
	}

	/**
	 * 获取指定的外层HTML标签
	 * @param {string|undefined} tag HTML标签名
	 * @returns {[Token, Token]}
	 * @complexity `n`
	 * @throws `RangeError` 非法的标签或空标签
	 */
	findEnclosingHtml(tag) {
		if (tag !== undefined && typeof tag !== 'string') {
			this.typeError('findEnclosingHtml', 'String');
		}
		tag = tag?.toLowerCase();
		if (tag !== undefined && !this.#config.html.slice(0, 2).flat().includes(tag)) {
			throw new RangeError(`非法的标签或空标签：${tag}`);
		}
		const {parentNode} = this;
		if (!parentNode) {
			return undefined;
		}
		const {childNodes} = parentNode,
			index = childNodes.indexOf(this);
		let i;
		for (i = index - 1; i >= 0; i--) {
			const {type, name, selfClosing, closing} = childNodes[i];
			if (type === 'html' && (!tag || name === tag) && selfClosing === false && closing === false) {
				break;
			}
		}
		if (i === -1) {
			return parentNode.findEnclosingHtml(tag);
		}
		const opening = childNodes[i];
		for (i = index + 1; i < childNodes.length; i++) {
			const {type, name, selfClosing, closing} = childNodes[i];
			if (type === 'html' && name === opening.name && selfClosing === false && closing === true) {
				break;
			}
		}
		return i === childNodes.length
			? parentNode.findEnclosingHtml(tag)
			: [opening, childNodes[i]];
	}

	/**
	 * 获取全部分类
	 * @complexity `n`
	 */
	getCategories() {
		return this.querySelectorAll('category').map(({name, sortkey}) => [name, sortkey]);
	}

	/**
	 * 重新解析单引号
	 * @throws `Error` 不接受QuoteToken作为子节点
	 */
	redoQuotes() {
		const acceptable = this.getAttribute('acceptable');
		if (acceptable && !acceptable.QuoteToken?.some(
			range => typeof range !== 'number' && range.start === 0 && range.end === Infinity && range.step === 1,
		)) {
			throw new Error(`${this.constructor.name} 不接受 QuoteToken 作为子节点！`);
		}
		for (const quote of this.childNodes) {
			if (quote.type === 'quote') {
				quote.replaceWith(String(quote));
			}
		}
		this.normalize();
		/** @type {[number, AstText][]} */
		const textNodes = [...this.childNodes.entries()].filter(([, {type}]) => type === 'text'),
			indices = textNodes.map(([i]) => this.getRelativeIndex(i)),
			token = Parser.run(() => {
				const root = new Token(text(textNodes.map(([, str]) => str)), this.getAttribute('config'));
				return root.setAttribute('stage', 6).parse(7);
			});
		for (const quote of [...token.childNodes].reverse()) {
			if (quote.type === 'quote') {
				const index = quote.getRelativeIndex(),
					n = indices.findLastIndex(textIndex => textIndex <= index);
				this.childNodes[n].splitText(index - indices[n]);
				this.childNodes[n + 1].splitText(Number(quote.name));
				this.removeAt(n + 1);
				this.insertAt(quote, n + 1);
			}
		}
		this.normalize();
	}

	/** 解析部分魔术字 */
	solveConst() {
		const ArgToken = require('./arg'),
			ParameterToken = require('./parameter');
		const targets = this.querySelectorAll('magic-word, arg'),
			magicWords = new Set(['if', 'ifeq', 'switch']);
		for (let i = targets.length - 1; i >= 0; i--) {
			const /** @type {ArgToken} */ target = targets[i],
				{type, name, default: argDefault, childNodes, length} = target;
			if (type === 'arg' || type === 'magic-word' && magicWords.has(name)) {
				let replace = '';
				if (type === 'arg') {
					replace = argDefault === false ? String(target) : argDefault;
				} else if (name === 'if' && !childNodes[1].querySelector('magic-word, template')) {
					replace = String(childNodes[String(childNodes[1] ?? '').trim() ? 2 : 3] ?? '').trim();
				} else if (name === 'ifeq'
					&& !childNodes.slice(1, 3).some(child => child.querySelector('magic-word, template'))
				) {
					replace = String(childNodes[
						String(childNodes[1] ?? '').trim() === String(childNodes[2] ?? '') ? 3 : 4
					] ?? '').trim();
				} else if (name === 'switch') {
					const key = String(childNodes[1] ?? '').trim();
					let defaultVal = '',
						found = false,
						transclusion = false,
						j = 2;
					for (; j < length; j++) {
						const /** @type {ParameterToken} */ {anon, name: option, value, firstChild} = childNodes[j];
						transclusion = firstChild.querySelector('magic-word, template');
						if (anon) {
							if (j === length - 1) {
								defaultVal = value;
							} else if (transclusion) {
								break;
							} else {
								found ||= key === value;
							}
						} else if (transclusion) {
							break;
						} else if (found || option === key) {
							replace = value;
							break;
						} else if (option.toLowerCase() === '#default') {
							defaultVal = value;
						}
						if (j === length - 1) {
							replace = defaultVal;
						}
					}
					if (transclusion) {
						continue;
					}
				}
				target.replaceWith(replace);
			}
		}
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
	}

	/**
	 * 解析、重构、生成部分Token的`name`属性
	 * @param {number} n 最大解析层级
	 * @param {boolean} include 是否嵌入
	 */
	parse(n = MAX_STAGE, include = false) {
		if (!Number.isInteger(n)) {
			this.typeError('parse', 'Number');
		}
		while (this.#stage < n) {
			this.#parseOnce(this.#stage, include);
		}
		if (n) {
			this.#build();
			this.afterBuild();
		}
		return this;
	}

	/**
	 * 解析HTML注释和扩展标签
	 * @param {boolean} includeOnly 是否嵌入
	 */
	#parseCommentAndExt(includeOnly) {
		const parseCommentAndExt = require('../parser/commentAndExt');
		this.setText(parseCommentAndExt(String(this.firstChild), this.#config, this.#accum, includeOnly));
	}

	/** 解析花括号 */
	#parseBrackets() {
		const parseBrackets = require('../parser/brackets');
		const str = this.type === 'root' ? String(this.firstChild) : `\0${String(this.firstChild)}`,
			parsed = parseBrackets(str, this.#config, this.#accum);
		this.setText(this.type === 'root' ? parsed : parsed.slice(1));
	}

	/** 解析HTML标签 */
	#parseHtml() {
		const parseHtml = require('../parser/html');
		this.setText(parseHtml(String(this.firstChild), this.#config, this.#accum));
	}

	/** 解析表格 */
	#parseTable() {
		const parseTable = require('../parser/table'),
			TableToken = require('./table');
		this.setText(parseTable(this, this.#config, this.#accum));
		for (const table of this.#accum) {
			if (table instanceof TableToken && table.type !== 'td') {
				table.normalize();
				const {childNodes: [, child]} = table;
				if (typeof child === 'string' && child.includes('\0')) {
					table.removeAt(1);
					const inner = new Token(child, this.#config, true, this.#accum);
					table.insertAt(inner, 1);
					inner.setAttribute('stage', 4);
				}
			}
		}
	}

	/** 解析\<hr\>和状态开关 */
	#parseHrAndDoubleUndescore() {
		const parseHrAndDoubleUnderscore = require('../parser/hrAndDoubleUnderscore');
		this.setText(parseHrAndDoubleUnderscore(this, this.#config, this.#accum));
	}

	/** 解析内部链接 */
	#parseLinks() {
		const parseLinks = require('../parser/links');
		this.setText(parseLinks(String(this.firstChild), this.#config, this.#accum));
	}

	/** 解析单引号 */
	#parseQuotes() {
		const parseQuotes = require('../parser/quotes');
		const lines = String(this.firstChild).split('\n');
		for (let i = 0; i < lines.length; i++) {
			lines[i] = parseQuotes(lines[i], this.#config, this.#accum);
		}
		this.setText(lines.join('\n'));
	}

	/** 解析外部链接 */
	#parseExternalLinks() {
		const parseExternalLinks = require('../parser/externalLinks');
		this.setText(parseExternalLinks(String(this.firstChild), this.#config, this.#accum));
	}

	/** 解析自由外链 */
	#parseMagicLinks() {
		const parseMagicLinks = require('../parser/magicLinks');
		this.setText(parseMagicLinks(String(this.firstChild), this.#config, this.#accum));
	}

	/** 解析列表 */
	#parseList() {
		if (this.type === 'image-parameter') {
			return;
		}
		const parseList = require('../parser/list');
		const lines = String(this.firstChild).split('\n');
		let i = this.type === 'root' || this.type === 'ext-inner' && this.type === 'poem' ? 0 : 1;
		for (; i < lines.length; i++) {
			lines[i] = parseList(lines[i], this.#config, this.#accum);
		}
		this.setText(lines.join('\n'));
	}

	/** 解析语言变体转换 */
	#parseConverter() {
		const parseConverter = require('../parser/converter');
		this.setText(parseConverter(String(this.firstChild), this.#config, this.#accum));
	}
}

Parser.classes.Token = __filename;
module.exports = Token;
