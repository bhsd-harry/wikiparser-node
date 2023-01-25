'use strict';

const Parser = require('../..'),
	Token = require('..'),
	TrToken = require('./tr');

/**
 * `<td>`、`<th>`和`<caption>`
 * @classdesc `{childNodes: [SyntaxToken, AttributesToken, Token]}`
 */
class TdToken extends TrToken {
	type = 'td';
	#innerSyntax = '';

	/**
	 * @param {string} syntax 单元格语法
	 * @param {string} inner 内部wikitext
	 * @param {accum} accum
	 */
	constructor(syntax, inner, config = Parser.getConfig(), accum = []) {
		let innerSyntax = inner?.match(/\||\0\d+!\x7F/u),
			attr = innerSyntax ? inner.slice(0, innerSyntax.index) : '';
		if (/\[\[|-\{/u.test(attr)) {
			innerSyntax = undefined;
			attr = '';
		}
		super(syntax, attr, config, accum);
		if (innerSyntax) {
			[this.#innerSyntax] = innerSyntax;
		}
		// eslint-disable-next-line no-unsafe-optional-chaining
		const innerToken = new Token(inner?.slice(innerSyntax?.index + this.#innerSyntax.length), config, true, accum);
		innerToken.type = 'td-inner';
		this.insertAt(innerToken.setAttribute('stage', 4));
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
	 * @returns {string}
	 * @complexity `n`
	 */
	toString(selector) {
		const {childNodes: [syntax, attr, inner]} = this;
		return `${syntax.toString()}${attr.toString()}${this.#innerSyntax}${inner.toString()}`;
	}

	/**
	 * @override
	 * @returns {string}
	 * @complexity `n`
	 */
	text() {
		const {childNodes: [syntax, attr, inner]} = this;
		return `${syntax.text()}${attr.text()}${this.#innerSyntax}${inner.text()}`;
	}

	/**
	 * @override
	 * @param {number} i 子节点位置
	 */
	getGaps(i = 0) {
		i = i < 0 ? i + this.childNodes.length : i;
		if (i === 1) {
			return this.#innerSyntax.length;
		}
		return 0;
	}

	/** @override */
	print() {
		const {childNodes: [syntax, attr, inner]} = this;
		return `<span class="wpb-td">${syntax.print()}${attr.print()}${this.#innerSyntax}${inner.print()}</span>`;
	}
}

module.exports = TdToken;
