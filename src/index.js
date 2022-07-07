'use strict';

const AstElement = require('../lib/element'),
	/** @type {Parser} */ Parser = require('..'),
	{MAX_STAGE} = Parser;

class Token extends AstElement {
	type = 'root';
	/** 解析阶段，参见顶部注释。只对plain Token有意义。 */ #stage = 0;
	#config;
	/** 这个数组起两个作用：1. 数组中的Token会在build时替换`/\x00\d+.\x7f/`标记；2. 数组中的Token会依次执行parseOnce和build方法。 */
	#accum;
	/** @type {boolean} */ #include;

	/**
	 * @param {?string} wikitext
	 * @param {accum} accum
	 * @param {acceptable} acceptable
	 */
	constructor(wikitext, config = Parser.getConfig(), halfParsed = false, accum = []) {
		super();
		if (typeof wikitext === 'string') {
			this.appendChild(halfParsed ? wikitext : wikitext.replace(/[\x00\x7f]/g, ''));
		}
		this.#config = config;
		this.#accum = accum;
		accum.push(this);
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

	isPlain() {
		return this.constructor === Token;
	}

	/**
	 * @template {string|Token} T
	 * @param {T} token
	 * @complexity `n`
	 */
	insertAt(token, i = this.childNodes.length) {
		super.insertAt(token, i);
		if (token instanceof Token && token.type === 'root') {
			token.type = 'plain';
		}
		return token;
	}

	/** @param {string} title */
	normalizeTitle(title, defaultNs = 0, halfParsed = false) {
		return Parser.normalizeTitle(title, defaultNs, this.#include, this.#config, halfParsed);
	}

	/**
	 * 将维基语法替换为占位符
	 * @this {Token & {firstChild: string}}
	 */
	parseOnce(n = this.#stage, include = false) {
		if (n < this.#stage || !this.isPlain() || this.childNodes.length === 0) {
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
				this.#parseConverter();
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
		return str.split(/[\x00\x7f]/).map((s, i) => {
			if (i % 2 === 0) {
				return s;
			}
			return this.#accum[Number(s.slice(0, -1))];
		});
	}

	/**
	 * 将占位符替换为子Token
	 * @complexity `n`
	 */
	build() {
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
		if (this.type === 'root') {
			for (const token of this.#accum) {
				token.afterBuild();
			}
		}
		return this;
	}

	/** 解析、重构、生成部分Token的`name`属性 */
	parse(n = MAX_STAGE, include = false) {
		this.#include = Boolean(include);
		while (this.#stage < n) {
			this.parseOnce(this.#stage, include);
		}
		return n ? this.build().afterBuild() : this;
	}

	#parseCommentAndExt(includeOnly = false) {
		const parseCommentAndExt = require('../parser/commentAndExt');
		this.setText(parseCommentAndExt(this.firstChild, this.#config, this.#accum, includeOnly));
	}

	#parseBrackets() {
		const parseBrackets = require('../parser/brackets');
		this.setText(parseBrackets(this.firstChild, this.#config, this.#accum));
	}

	#parseHtml() {
		const parseHtml = require('../parser/html');
		this.setText(parseHtml(this.firstChild, this.#config, this.#accum));
	}

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

	#parseHrAndDoubleUndescore() {
		const parseHrAndDoubleUnderscore = require('../parser/hrAndDoubleUnderscore');
		this.setText(parseHrAndDoubleUnderscore(this.firstChild, this.#config, this.#accum));
	}

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

	#parseExternalLinks() {
		const parseExternalLinks = require('../parser/externalLinks');
		this.setText(parseExternalLinks(this.firstChild, this.#config, this.#accum));
	}

	#parseMagicLinks() {
		const parseMagicLinks = require('../parser/magicLinks');
		this.setText(parseMagicLinks(this.firstChild, this.#config, this.#accum));
	}

	/** @this {Token & {firstChild: string}} */
	#parseList() {
		const parseList = require('../parser/list'),
			lines = this.firstChild.split('\n');
		for (let i = this.type === 'root' ? 0 : 1; i < lines.length; i++) {
			lines[i] = parseList(lines[i], this.#config, this.#accum);
		}
		this.setText(lines.join('\n'));
	}

	#parseConverter() {
		const parseConverter = require('../parser/converter');
		this.setText(parseConverter(this.firstChild, this.#config, this.#accum));
	}
}

module.exports = Token;
