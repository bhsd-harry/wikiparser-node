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
 * s: `{{{|subst:}}}`
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
	Parser = require('..'),
	AstElement = require('../lib/element'),
	AstText = require('../lib/text');
const {MAX_STAGE} = Parser;

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
				return new AstText(s);
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
	 * @param {string} wikitext wikitext
	 * @param {accum} accum
	 */
	constructor(wikitext, config = Parser.getConfig(), halfParsed = false, accum = [], acceptable = undefined) {
		super();
		if (typeof wikitext === 'string') {
			this.insertAt(halfParsed ? wikitext : wikitext.replace(/[\0\x7F]/gu, ''));
		}
		this.#config = config;
		this.#accum = accum;
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
				return false;
			}
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
	 */
	insertAt(token, i = this.length) {
		if (typeof token === 'string') {
			token = new AstText(token);
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
	 * @param {boolean} selfLink 是否允许selfLink
	 */
	normalizeTitle(title, defaultNs = 0, halfParsed = false, decode = false, selfLink = false) {
		return Parser.normalizeTitle(title, defaultNs, this.#include, this.#config, halfParsed, decode, selfLink);
	}

	/** 生成部分Token的`name`属性 */
	afterBuild() {
		if (this.type === 'root') {
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
		if (this.#config.excludes.includes('html')) {
			return;
		}
		const parseHtml = require('../parser/html');
		this.setText(parseHtml(String(this.firstChild), this.#config, this.#accum));
	}

	/** 解析表格 */
	#parseTable() {
		if (this.#config.excludes.includes('table')) {
			return;
		}
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
		if (this.#config.excludes.includes('hr')) {
			return;
		}
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
		if (this.#config.excludes.includes('quote')) {
			return;
		}
		const parseQuotes = require('../parser/quotes');
		const lines = String(this.firstChild).split('\n');
		for (let i = 0; i < lines.length; i++) {
			lines[i] = parseQuotes(lines[i], this.#config, this.#accum);
		}
		this.setText(lines.join('\n'));
	}

	/** 解析外部链接 */
	#parseExternalLinks() {
		if (this.#config.excludes.includes('extLink')) {
			return;
		}
		const parseExternalLinks = require('../parser/externalLinks');
		this.setText(parseExternalLinks(String(this.firstChild), this.#config, this.#accum));
	}

	/** 解析自由外链 */
	#parseMagicLinks() {
		if (this.#config.excludes.includes('magicLink')) {
			return;
		}
		const parseMagicLinks = require('../parser/magicLinks');
		this.setText(parseMagicLinks(String(this.firstChild), this.#config, this.#accum));
	}

	/** 解析列表 */
	#parseList() {
		if (this.#config.excludes.includes('list')) {
			return;
		}
		const parseList = require('../parser/list');
		const lines = String(this.firstChild).split('\n');
		let i = this.type === 'root' || this.type === 'ext-inner' && this.name === 'poem' ? 0 : 1;
		for (; i < lines.length; i++) {
			lines[i] = parseList(lines[i], this.#config, this.#accum);
		}
		this.setText(lines.join('\n'));
	}

	/** 解析语言变体转换 */
	#parseConverter() {
		if (this.#config.variants?.length > 0) {
			const parseConverter = require('../parser/converter');
			this.setText(parseConverter(String(this.firstChild), this.#config, this.#accum));
		}
	}
}

module.exports = Token;
