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

	/**
	 * @this {TdToken & {previousSibling: TdToken}}
	 * @returns {'td'|'th'|'caption'}
	 */
	get subtype() {
		const syntax = this.firstElementChild.text();
		if (syntax.startsWith('\n')) {
			if (syntax.endsWith('!')) {
				return 'th';
			} else if (syntax.endsWith('+')) {
				return 'caption';
			}
			return 'td';
		}
		return this.previousSibling.subtype;
	}

	static openingPattern = /^(?:\n[\S\n]*(?:[|!]|\|\+|{{\s*!\s*}}\+?)|(?:\||{{\s*!\s*}}){2}|!!|{{\s*!!\s*}})$/;

	/**
	 * @param {string} syntax
	 * @param {string} inner
	 * @param {accum} accum
	 */
	constructor(syntax, inner, config = Parser.getConfig(), accum = []) {
		let innerSyntax = inner.match(/\||\x00\d+!\x7f/),
			attr = innerSyntax ? inner.slice(0, innerSyntax.index) : '';
		if (/\[\[|-{/.test(attr)) {
			innerSyntax = null;
			attr = '';
		}
		super(syntax, attr, config, accum, TdToken.openingPattern);
		if (innerSyntax) {
			[this.#innerSyntax] = innerSyntax;
		}
		const innerToken = new Token(inner.slice(innerSyntax?.index + this.#innerSyntax.length), config, true, accum);
		innerToken.type = 'td-inner';
		innerToken.setAttribute('stage', 4);
		this.setAttribute('acceptable', {SyntaxToken: 0, AttributeToken: 1, Token: 2}).appendChild(innerToken);
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
			super.setAttribute(key, value);
		} else if (!Parser.debugging && externalUse('setAttribute')) {
			throw new RangeError(`使用 ${this.constructor.name}.setAttribute 方法设置私有属性 #${key} 仅用于代码调试！`);
		} else {
			this.#innerSyntax = String(value);
		}
		return this;
	}

	build() {
		if (this.#innerSyntax.includes('\x00')) {
			this.#innerSyntax = this.buildFromStr(this.#innerSyntax).map(String).join('');
		}
		return super.build();
	}

	toString() {
		const [syntax, attr, inner] = this.children,
			attrStr = attr.toString();
		if (attrStr) {
			this.#innerSyntax ||= '|';
		}
		return `${syntax.toString()}${attrStr}${this.#innerSyntax}${inner.toString()}`;
	}

	getGaps(i = 0) {
		if (i !== 1) {
			return 0;
		} else if (this.children[1].toString()) {
			this.#innerSyntax ||= '|';
		}
		return this.#innerSyntax.length;
	}

	text() {
		const [syntax, attr, inner] = this.children;
		if (attr.toString()) {
			this.#innerSyntax ||= '|';
		}
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
