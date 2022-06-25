'use strict';

const fixedToken = require('../../mixin/fixedToken'),
	{externalUse} = require('../../util/debug'),
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

	get subtype() {
		return this.getSyntax().subtype;
	}

	isIndependent() {
		return this.firstElementChild.text().startsWith('\n');
	}

	/** @returns {{subtype: 'td'|'th'|'caption', escape: boolean, correction: boolean}} */
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

	#correct() {
		if (this.children[1].toString()) {
			this.#innerSyntax ||= '|';
		}
		const {subtype, escape, correction} = this.getSyntax();
		if (correction) {
			this.setSyntax(subtype, escape);
		}
	}

	independence() {
		if (!this.isIndependent()) {
			const {subtype, escape} = this.getSyntax();
			this.setSyntax(subtype, escape);
		}
	}

	/** @returns {string} */
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

	/** @returns {string} */
	text() {
		this.#correct();
		const [syntax, attr, inner] = this.children;
		return `${syntax.text()}${attr.text()}${this.#innerSyntax}${inner.text()}`;
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
