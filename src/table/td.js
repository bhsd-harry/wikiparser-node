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

	/** @complexity `n` */
	get subtype() {
		return this.getSyntax().subtype;
	}
	set subtype(subtype) {
		this.setSyntax(subtype);
	}

	get rowspan() {
		return this.getAttr('rowspan');
	}
	set rowspan(rowspan) {
		this.setAttr('rowspan', rowspan);
	}
	get colspan() {
		return this.getAttr('colspan');
	}
	set colspan(colspan) {
		this.setAttr('colspan', colspan);
	}

	isIndependent() {
		return this.firstElementChild.text().startsWith('\n');
	}

	/**
	 * @returns {{subtype: 'td'|'th'|'caption', escape: boolean, correction: boolean}}
	 * @complexity `n`
	 */
	getSyntax() {
		const syntax = this.firstElementChild.text(),
			escape = syntax.includes('{{');
		let subtype = 'td';
		if (syntax.endsWith('!')) {
			subtype = 'th';
		} else if (syntax.endsWith('+')) {
			subtype = 'caption';
		}
		if (this.isIndependent()) {
			return {subtype, escape, correction: false};
		}
		const {previousElementSibling} = this;
		if (previousElementSibling?.type !== 'td') {
			return {subtype, escape, correction: true};
		}
		const result = previousElementSibling.getSyntax();
		result.escape ||= escape;
		result.correction = previousElementSibling.lastElementChild.offsetHeight > 1;
		if (subtype === 'th' && result.subtype !== 'th') {
			result.subtype = 'th';
			result.correction = true;
		}
		return result;
	}

	static openingPattern = /^(?:\n[\S\n]*(?:[|!]|\|\+|{{\s*!\s*}}\+?)|(?:\||{{\s*!\s*}}){2}|!!|{{\s*!!\s*}})$/;

	/**
	 * @param {string} syntax
	 * @param {string} inner
	 * @param {accum} accum
	 */
	constructor(syntax, inner, config = Parser.getConfig(), accum = []) {
		let innerSyntax = inner?.match(/\||\x00\d+!\x7f/),
			attr = innerSyntax ? inner.slice(0, innerSyntax.index) : '';
		if (/\[\[|-{/.test(attr)) {
			innerSyntax = null;
			attr = '';
		}
		super(syntax, attr, config, accum, TdToken.openingPattern);
		if (innerSyntax) {
			[this.#innerSyntax] = innerSyntax;
		}
		const innerToken = new Token(inner?.slice(innerSyntax?.index + this.#innerSyntax.length), config, true, accum);
		innerToken.type = 'td-inner';
		this.setAttribute('acceptable', {SyntaxToken: 0, AttributeToken: 1, Token: 2})
			.appendChild(innerToken.setAttribute('stage', 4));
	}

	cloneNode() {
		const token = super.cloneNode();
		token.setAttribute('innerSyntax', this.#innerSyntax);
		return token;
	}

	/**
	 * @param {string|Token} inner
	 * @param {'td'|'th'|'caption'} subtype
	 * @param {Record<string, string>} attr
	 */
	static create(inner, subtype = 'td', attr = {}, include = false, config = Parser.getConfig()) {
		if (typeof inner !== 'string' && (!(inner instanceof Token) || !inner.isPlain()) || typeof attr !== 'object') {
			throw new TypeError('TdToken.create 方法仅接受 String、Token、Object 作为输入参数！');
		} else if (!['td', 'th', 'caption'].includes(subtype)) {
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
	 * @template {string} T
	 * @param {T} key
	 * @returns {TokenAttribute<T>}
	 */
	getAttribute(key) {
		if (key === 'innerSyntax') {
			return this.#innerSyntax;
		}
		return super.getAttribute(key);
	}

	/**
	 * @template {string} T
	 * @param {T} key
	 * @param {TokenAttribute<T>} value
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

	build() {
		if (this.#innerSyntax.includes('\x00')) {
			this.#innerSyntax = this.buildFromStr(this.#innerSyntax).map(String).join('');
		}
		return super.build();
	}

	static #aliases = {td: '\n|', th: '\n!', caption: '\n|+'};

	/** @param {string} syntax */
	setSyntax(syntax, escape = false) {
		super.setSyntax(TdToken.#aliases[syntax] ?? syntax, escape);
	}

	/** @complexity `n` */
	#correct() {
		if (this.children[1].toString()) {
			this.#innerSyntax ||= '|';
		}
		const {subtype, escape, correction} = this.getSyntax();
		if (correction) {
			this.setSyntax(subtype, escape);
		}
	}

	/** @complexity `n` */
	independence() {
		if (!this.isIndependent()) {
			const {subtype, escape} = this.getSyntax();
			this.setSyntax(subtype, escape);
		}
	}

	/**
	 * @returns {string}
	 * @complexity `n`
	 */
	toString() {
		this.#correct();
		const [syntax, attr, inner] = this.children;
		return `${syntax.toString()}${attr.toString()}${this.#innerSyntax}${inner.toString()}`;
	}

	getGaps(i = 0) {
		if (i !== 1) {
			return 0;
		}
		this.#correct();
		return this.#innerSyntax.length;
	}

	/**
	 * @returns {string}
	 * @complexity `n`
	 */
	text() {
		this.#correct();
		const [syntax, attr, inner] = this.children;
		return `${syntax.text()}${attr.text()}${this.#innerSyntax}${inner.text()}`;
	}

	/**
	 * @template {string} T
	 * @param {T} key
	 * @returns {T extends 'rowspan'|'colspan' ? number : Record<string, string|true>}
	 */
	getAttr(key) {
		const /** @type {string|true} */ value = super.getAttr(key);
		key = key?.toLowerCase()?.trim();
		return ['rowspan', 'colspan'].includes(key) ? Number(value) || 1 : value;
	}

	/**
	 * @template {string} T
	 * @param {T} key
	 * @param {T extends 'rowspan'|'colspan' ? number : string|boolean} value
	 */
	setAttr(key, value) {
		if (typeof key !== 'string') {
			typeError(this, 'setAttr', 'String');
		}
		key = key.toLowerCase().trim();
		if (typeof value === 'number' && ['rowspan', 'colspan'].includes(key)) {
			value = value === 1 ? false : String(value);
		}
		const /** @type {boolean} */ result = super.setAttr(key, value);
		if (!this.children[1].toString()) {
			this.#innerSyntax = '';
		}
		return result;
	}

	escape() {
		super.escape();
		if (this.children[1].toString()) {
			this.#innerSyntax ||= '{{!}}';
		}
		if (this.#innerSyntax === '|') {
			this.#innerSyntax = '{{!}}';
		}
	}

	getRowCount() {
		throw new Error(`${this.constructor.name}.getRowCount 方法只可用于表格或表格行！`);
	}

	getNthCol() {
		throw new Error(`${this.constructor.name}.getNthCol 方法只可用于表格或表格行！`);
	}

	insertTableCell() {
		throw new Error(`${this.constructor.name}.insertTableCell 方法只可用于表格或表格行！`);
	}
}

Parser.classes.TdToken = __filename;
module.exports = TdToken;
