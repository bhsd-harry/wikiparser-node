'use strict';

const /** @type {Parser} */ Parser = require('..'),
	Token = require('.');

/**
 * HTML标签
 * @classdesc `{childNodes: [AttributeToken]}`
 */
class HtmlToken extends Token {
	type = 'html';
	closing;
	selfClosing;
	#tag;

	/**
	 * @param {string} name
	 * @param {AttributeToken} attr
	 * @param {boolean} closing
	 * @param {boolean} selfClosing
	 * @param {accum} accum
	 */
	constructor(name, attr, closing, selfClosing, config = Parser.getConfig(), accum = []) {
		super(undefined, config, true, accum);
		this.appendChild(attr);
		this.closing = closing;
		this.selfClosing = selfClosing;
		this.#tag = name;
	}

	toString() {
		return `<${this.closing ? '/' : ''}${this.#tag}${super.toString()}${this.selfClosing ? '/' : ''}>`;
	}

	print() {
		return super.print({
			pre: `&lt;${this.closing ? '/' : ''}${this.#tag}`, post: `${this.selfClosing ? '/' : ''}&gt;`,
		});
	}

	text() {
		return `<${this.closing ? '/' : ''}${this.#tag}${super.text()}${this.selfClosing ? '/' : ''}>`;
	}
}

module.exports = HtmlToken;
