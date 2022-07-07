'use strict';

const /** @type {Parser} */ Parser = require('../..'),
	Token = require('..'),
	TrToken = require('./tr');

/**
 * `<td>`、`<th>`和`<caption>`
 * @classdesc `{childNodes: [SyntaxToken, AttributeToken, Token]}`
 */
class TdToken extends TrToken {
	type = 'td';
	#innerSyntax = '';

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
		this.appendChild(innerToken.setAttribute('stage', 4));
	}

	afterBuild() {
		if (this.#innerSyntax.includes('\x00')) {
			this.#innerSyntax = this.buildFromStr(this.#innerSyntax).map(String).join('');
		}
		return this;
	}

	/**
	 * @returns {string}
	 * @complexity `n`
	 */
	toString() {
		const [syntax, attr, inner] = this.children;
		return `${syntax.toString()}${attr.toString()}${this.#innerSyntax}${inner.toString()}`;
	}

	print() {
		const [syntax, attr, inner] = this.children;
		return `<span class="td">${syntax.print()}${attr.print()}${this.#innerSyntax}${inner.print()}</span>`;
	}

	/**
	 * @returns {string}
	 * @complexity `n`
	 */
	text() {
		const [syntax, attr, inner] = this.children;
		return `${syntax.text()}${attr.text()}${this.#innerSyntax}${inner.text()}`;
	}
}

module.exports = TdToken;
