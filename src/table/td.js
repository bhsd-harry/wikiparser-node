'use strict';

const fixedToken = require('../../mixin/fixedToken'),
	{externalUse, typeError} = require('../../util/debug'),
	/** @type {Parser} */ Parser = require('../..'),
	Token = require('..'),
	TrToken = require('./tr');

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

	/** 是否位于行首 */
	isIndependent() {
		return this.firstElementChild.text().startsWith('\n');
	}

	/**
	 * 获取单元格语法信息
	 * @returns {{subtype: 'td'|'th'|'caption', escape: boolean, correction: boolean}}
	 * @complexity `n`
	 */
	getSyntax() {
		const syntax = this.firstElementChild.text(),
			esc = syntax.includes('{{');
		let subtype = 'td';
		if (syntax.endsWith('!')) {
			subtype = 'th';
		} else if (syntax.endsWith('+')) {
			subtype = 'caption';
		}
		if (this.isIndependent()) {
			return {subtype, escape: esc, correction: false};
		}
		const {previousElementSibling} = this;
		if (previousElementSibling?.type !== 'td') {
			return {subtype, escape: esc, correction: true};
		}
		const result = previousElementSibling.getSyntax();
		result.escape ||= esc;
		result.correction = previousElementSibling.lastElementChild.offsetHeight > 1;
		if (subtype === 'th' && result.subtype !== 'th') {
			result.subtype = 'th';
			result.correction = true;
		}
		return result;
	}

	static openingPattern
		= /^(?:\n[\S\n]*(?:[|!]|\|\+|\{\{\s*!\s*\}\}\+?)|(?:\||\{\{\s*!\s*\}\}){2}|!!|\{\{\s*!!\s*\}\})$/u;

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
		super(syntax, attr, config, accum, TdToken.openingPattern);
		if (innerSyntax) {
			[this.#innerSyntax] = innerSyntax;
		}
		// eslint-disable-next-line no-unsafe-optional-chaining
		const innerToken = new Token(inner?.slice(innerSyntax?.index + this.#innerSyntax.length), config, true, accum);
		innerToken.type = 'td-inner';
		this.setAttribute('acceptable', {SyntaxToken: 0, AttributeToken: 1, Token: 2})
			.seal(['getRowCount', 'getNthCol', 'insertTableCell'])
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
		if (typeof inner !== 'string' && (!(inner instanceof Token) || !inner.isPlain()) || typeof attr !== 'object') {
			typeError(this, 'create', 'String', 'Token', 'Object');
		} else if (subtype !== 'td' && subtype !== 'th' && subtype !== 'caption') {
			throw new RangeError('单元格的子类型只能为 "td"、"th" 或 "caption"！');
		} else if (typeof inner === 'string') {
			inner = Parser.parse(inner, include, undefined, config);
		}
		const token = Parser.run(() => new TdToken('\n|', undefined, config));
		token.setSyntax(subtype);
		token.lastElementChild.safeReplaceWith(inner);
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
		if (key === 'innerSyntax') {
			return this.#innerSyntax;
		}
		return super.getAttribute(key);
	}

	/**
	 * @override
	 * @template {string} T
	 * @param {T} key 属性键
	 * @param {TokenAttribute<T>} value 属性值
	 * @returns {this}
	 * @throws `RangeError` 仅用于代码调试
	 */
	setAttribute(key, value) {
		if (key !== 'innerSyntax') {
			return super.setAttribute(key, value);
		} else if (!Parser.debugging && externalUse('setAttribute')) {
			throw new RangeError(`使用 ${this.constructor.name}.setAttribute 方法设置私有属性 #${key} 仅用于代码调试！`);
		}
		this.#innerSyntax = String(value);
		return this;
	}

	/** @override */
	afterBuild() {
		if (this.#innerSyntax.includes('\0')) {
			this.#innerSyntax = this.buildFromStr(this.#innerSyntax).map(String).join('');
		}
		return this;
	}

	static #aliases = {td: '\n|', th: '\n!', caption: '\n|+'};

	/**
	 * @override
	 * @param {string} syntax 表格语法
	 * @param {boolean} esc 是否需要转义
	 */
	setSyntax(syntax, esc = false) {
		super.setSyntax(TdToken.#aliases[syntax] ?? syntax, esc);
	}

	/**
	 * 修复\<td\>语法
	 * @complexity `n`
	 */
	#correct() {
		if (this.children[1].toString()) {
			this.#innerSyntax ||= '|';
		}
		const {subtype, escape: esc, correction} = this.getSyntax();
		if (correction) {
			this.setSyntax(subtype, esc);
		}
	}

	/**
	 * 改为独占一行
	 * @complexity `n`
	 */
	independence() {
		if (!this.isIndependent()) {
			const {subtype, escape: esc} = this.getSyntax();
			this.setSyntax(subtype, esc);
		}
	}

	/**
	 * @override
	 * @returns {string}
	 * @complexity `n`
	 */
	toString() {
		this.#correct();
		const {children: [syntax, attr, inner]} = this;
		return `${syntax.toString()}${attr.toString()}${this.#innerSyntax}${inner.toString()}`;
	}

	/**
	 * @override
	 * @param {number} i 子节点位置
	 */
	getGaps(i = 0) {
		i = i < 0 ? i + this.childNodes.length : i;
		if (i !== 1) {
			return 0;
		}
		this.#correct();
		return this.#innerSyntax.length;
	}

	/**
	 * @override
	 * @returns {string}
	 * @complexity `n`
	 */
	text() {
		this.#correct();
		const {children: [syntax, attr, inner]} = this;
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
		if (!this.children[1].toString()) {
			this.#innerSyntax = '';
		}
		return result;
	}

	/** @override */
	escape() {
		super.escape();
		if (this.children[1].toString()) {
			this.#innerSyntax ||= '{{!}}';
		}
		if (this.#innerSyntax === '|') {
			this.#innerSyntax = '{{!}}';
		}
	}
}

Parser.classes.TdToken = __filename;
module.exports = TdToken;
