'use strict';

const fixedToken = require('../../mixin/fixedToken'),
	{typeError} = require('../../util/debug'),
	{isPlainObject} = require('../../util/base'),
	Parser = require('../..'),
	Token = require('..'),
	TrToken = require('./tr');

const aliases = {td: '\n|', th: '\n!', caption: '\n|+'},
	openingPattern = /^(?:\n[\S\n]*(?:[|!]|\|\+|\{\{\s*!\s*\}\}\+?)|(?:\||\{\{\s*!\s*\}\}){2}|!!|\{\{\s*!!\s*\}\})$/u;

/**
 * `<td>`、`<th>`和`<caption>`
 * @classdesc `{childNodes: [SyntaxToken, AttributeToken, Token]}`
 */
class TdToken extends fixedToken(TrToken) {
	type = 'td';
	#innerSyntax = '';

	/**
	 * 单元格类型
	 * @complexity `n`
	 */
	get subtype() {
		return this.getSyntax().subtype;
	}

	set subtype(subtype) {
		this.setSyntax(subtype);
	}

	/** rowspan */
	get rowspan() {
		return this.getAttr('rowspan');
	}

	set rowspan(rowspan) {
		this.setAttr('rowspan', rowspan);
	}

	/** colspan */
	get colspan() {
		return this.getAttr('colspan');
	}

	set colspan(colspan) {
		this.setAttr('colspan', colspan);
	}

	/** 内部wikitext */
	get innerText() {
		return this.lastChild.text();
	}

	/** 是否位于行首 */
	isIndependent() {
		return this.firstChild.text()[0] === '\n';
	}

	/**
	 * 获取单元格语法信息
	 * @returns {{subtype: 'td'|'th'|'caption', escape: boolean, correction: boolean}}
	 * @complexity `n`
	 */
	getSyntax() {
		const syntax = this.firstChild.text(),
			esc = syntax.includes('{{'),
			char = syntax.at(-1);
		let subtype = 'td';
		if (char === '!') {
			subtype = 'th';
		} else if (char === '+') {
			subtype = 'caption';
		}
		if (this.isIndependent()) {
			return {subtype, escape: esc, correction: false};
		}
		const {previousSibling} = this;
		if (previousSibling?.type !== 'td') {
			return {subtype, escape: esc, correction: true};
		}
		const result = previousSibling.getSyntax();
		result.escape ||= esc;
		result.correction = previousSibling.lastChild
			.toString('comment, ext, include, noinclude, arg, template, magic-word')
			.includes('\n');
		if (subtype === 'th' && result.subtype !== 'th') {
			result.subtype = 'th';
			result.correction = true;
		}
		return result;
	}

	getRowCount = undefined;
	getNthCol = undefined;
	insertTableCell = undefined;

	/**
	 * @param {string} syntax 单元格语法
	 * @param {string} inner 内部wikitext
	 * @param {accum} accum
	 */
	constructor(syntax, inner, config = Parser.getConfig(), accum = []) {
		let innerSyntax = inner?.match(/\||\0\d+!\x7F/u),
			attr = innerSyntax ? inner.slice(0, innerSyntax.index) : '';
		if (/\[\[|-\{/u.test(attr)) {
			innerSyntax = null;
			attr = '';
		}
		super(syntax, attr, config, accum, openingPattern);
		if (innerSyntax) {
			[this.#innerSyntax] = innerSyntax;
		}
		// eslint-disable-next-line no-unsafe-optional-chaining
		const innerToken = new Token(inner?.slice(innerSyntax?.index + this.#innerSyntax.length), config, true, accum);
		innerToken.type = 'td-inner';
		this.setAttribute('acceptable', {SyntaxToken: 0, AttributeToken: 1, Token: 2})
			.seal(['getRowCount', 'getNthCol', 'insertTableCell'], true)
			.appendChild(innerToken.setAttribute('stage', 4));
	}

	/** @override */
	cloneNode() {
		const /** @type {TdToken} */ token = super.cloneNode();
		token.setAttribute('innerSyntax', this.#innerSyntax);
		return token;
	}

	/**
	 * 创建新的单元格
	 * @param {string|Token} inner 内部wikitext
	 * @param {'td'|'th'|'caption'} subtype 单元格类型
	 * @param {Record<string, string>} attr 单元格属性
	 * @param {boolean} include 是否嵌入
	 * @throws `RangeError` 非法的单元格类型
	 */
	static create(inner, subtype = 'td', attr = {}, include = false, config = Parser.getConfig()) {
		if (typeof inner !== 'string' && inner?.constructor !== Token || !isPlainObject(attr)) {
			typeError(this, 'create', 'String', 'Token', 'Object');
		} else if (subtype !== 'td' && subtype !== 'th' && subtype !== 'caption') {
			throw new RangeError('单元格的子类型只能为 "td"、"th" 或 "caption"！');
		} else if (typeof inner === 'string') {
			inner = Parser.parse(inner, include, undefined, config);
		}
		const token = Parser.run(() => new TdToken('\n|', undefined, config));
		token.setSyntax(subtype);
		token.lastChild.safeReplaceWith(inner);
		for (const [k, v] of Object.entries(attr)) {
			token.setAttr(k, v);
		}
		return token;
	}

	/**
	 * @override
	 * @template {string} T
	 * @param {T} key 属性键
	 * @returns {TokenAttribute<T>}
	 */
	getAttribute(key) {
		return key === 'innerSyntax' ? this.#innerSyntax : super.getAttribute(key);
	}

	/**
	 * @override
	 * @template {string} T
	 * @param {T} key 属性键
	 * @param {TokenAttribute<T>} value 属性值
	 * @returns {this}
	 */
	setAttribute(key, value) {
		if (key === 'innerSyntax') {
			this.#innerSyntax = String(value);
			return this;
		}
		return super.setAttribute(key, value);
	}

	/** @override */
	afterBuild() {
		if (this.#innerSyntax.includes('\0')) {
			this.#innerSyntax = this.getAttribute('buildFromStr')(this.#innerSyntax).map(String).join('');
		}
		return this;
	}

	/**
	 * @override
	 * @param {string} syntax 表格语法
	 * @param {boolean} esc 是否需要转义
	 */
	setSyntax(syntax, esc) {
		super.setSyntax(aliases[syntax] ?? syntax, esc);
	}

	/**
	 * 修复\<td\>语法
	 * @complexity `n`
	 */
	#correct() {
		if (String(this.childNodes[1])) {
			this.#innerSyntax ||= '|';
		}
		const {subtype, escape, correction} = this.getSyntax();
		if (correction) {
			this.setSyntax(subtype, escape);
		}
	}

	/**
	 * 改为独占一行
	 * @complexity `n`
	 */
	independence() {
		if (!this.isIndependent()) {
			const {subtype, escape} = this.getSyntax();
			this.setSyntax(subtype, escape);
		}
	}

	/**
	 * @override
	 * @param {string} selector
	 * @returns {string}
	 * @complexity `n`
	 */
	toString(selector) {
		this.#correct();
		const {childNodes: [syntax, attr, inner]} = this;
		return selector && this.matches(selector)
			? ''
			: `${syntax.toString(selector)}${attr.toString(selector)}${this.#innerSyntax}${inner.toString(selector)}`;
	}

	/**
	 * @override
	 * @param {number} i 子节点位置
	 */
	getGaps(i = 0) {
		i = i < 0 ? i + this.childNodes.length : i;
		if (i === 1) {
			this.#correct();
			return this.#innerSyntax.length;
		}
		return 0;
	}

	/** @override */
	print() {
		const {childNodes: [syntax, attr, inner]} = this;
		return `<span class="wpb-td">${syntax.print()}${attr.print()}${this.#innerSyntax}${inner.print()}</span>`;
	}

	/**
	 * @override
	 * @returns {string}
	 * @complexity `n`
	 */
	text() {
		this.#correct();
		const {childNodes: [syntax, attr, inner]} = this;
		return `${syntax.text()}${attr.text()}${this.#innerSyntax}${inner.text()}`;
	}

	/**
	 * 获取单元格属性
	 * @template {string} T
	 * @param {T} key 属性键
	 * @returns {T extends 'rowspan'|'colspan' ? number : Record<string, string|true>}
	 */
	getAttr(key) {
		const /** @type {string|true} */ value = super.getAttr(key);
		key = key?.toLowerCase()?.trim();
		return key === 'rowspan' || key === 'colspan' ? Number(value) || 1 : value;
	}

	/**
	 * 设置单元格属性
	 * @template {string} T
	 * @param {T} key 属性键
	 * @param {T extends 'rowspan'|'colspan' ? number : string|boolean} value 属性值
	 */
	setAttr(key, value) {
		if (typeof key !== 'string') {
			this.typeError('setAttr', 'String');
		}
		key = key.toLowerCase().trim();
		if (typeof value === 'number' && (key === 'rowspan' || key === 'colspan')) {
			value = value === 1 ? false : String(value);
		}
		const /** @type {boolean} */ result = super.setAttr(key, value);
		if (!String(this.childNodes[1])) {
			this.#innerSyntax = '';
		}
		return result;
	}

	/** @override */
	escape() {
		super.escape();
		if (String(this.childNodes[1])) {
			this.#innerSyntax ||= '{{!}}';
		}
		if (this.#innerSyntax === '|') {
			this.#innerSyntax = '{{!}}';
		}
	}
}

Parser.classes.TdToken = __filename;
module.exports = TdToken;
