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
		= /^(?:\n[\S\n]*(?:[|!]|\|\+|\{\{\s*!\s*\}\}\+?)|(?:\||\{\{\s*!\s*\}\}){2}|!!|\{\{\s*!!\s*\}\})$/;

	getRowCount = undefined;
	getNthCol = undefined;
	insertTableCell = undefined;

	/**
	 * @param {string} syntax
	 * @param {string} inner
	 * @param {accum} accum
	 */
	constructor(syntax, inner, config = Parser.getConfig(), accum = []) {
		let innerSyntax = /\||\0\d+!\x7f/.exec(inner),
			attr = innerSyntax ? inner.slice(0, innerSyntax.index) : '';
		if (/\[\[|-\{/.test(attr)) {
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
			.seal(['getRowCount', 'getNthCol', 'insertTableCell']).appendChild(innerToken.setAttribute('stage', 4));
	}

	cloneNode() {
		const /** @type {TdToken} */ token = super.cloneNode();
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
	 * @return {this}
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

	afterBuild() {
		if (this.#innerSyntax.includes('\0')) {
			this.#innerSyntax = this.buildFromStr(this.#innerSyntax).map(String).join('');
		}
		return this;
	}

	static #aliases = {td: '\n|', th: '\n!', caption: '\n|+'};

	/** @param {string} syntax */
	setSyntax(syntax, esc = false) {
		super.setSyntax(TdToken.#aliases[syntax] ?? syntax, esc);
	}

	/** @complexity `n` */
	#correct() {
		if (this.children[1].toString()) {
			this.#innerSyntax ||= '|';
		}
		const {subtype, escape: esc, correction} = this.getSyntax();
		if (correction) {
			this.setSyntax(subtype, esc);
		}
	}

	/** @complexity `n` */
	independence() {
		if (!this.isIndependent()) {
			const {subtype, escape: esc} = this.getSyntax();
			this.setSyntax(subtype, esc);
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
		i = i < 0 ? i + this.childNodes.length : i;
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
		return key === 'rowspan' || key === 'colspan' ? Number(value) || 1 : value;
	}

	/**
	 * @template {string} T
	 * @param {T} key
	 * @param {T extends 'rowspan'|'colspan' ? number : string|boolean} value
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
