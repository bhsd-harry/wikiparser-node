'use strict';

const Parser = require('..'),
	Token = require('.');

/**
 * HTML标签
 * @classdesc `{childNodes: [AttributeToken]}`
 */
class HtmlToken extends Token {
	type = 'html';
	#closing;
	#selfClosing;
	#tag;

	/**
	 * @param {string} name 标签名
	 * @param {AttributeToken} attr 标签属性
	 * @param {boolean} closing 是否闭合
	 * @param {boolean} selfClosing 是否自封闭
	 * @param {accum} accum
	 */
	constructor(name, attr, closing, selfClosing, config = Parser.getConfig(), accum = []) {
		super(undefined, config, true, accum);
		this.appendChild(attr);
		this.#closing = closing;
		this.#selfClosing = selfClosing;
		this.#tag = name;
	}

	/** @override */
	toString() {
		return `<${this.#closing ? '/' : ''}${this.#tag}${super.toString()}${this.#selfClosing ? '/' : ''}>`;
	}

	/** @override */
	getPadding() {
		return this.#tag.length + (this.#closing ? 2 : 1);
	}

	/** @override */
	print() {
		return super.print({
			pre: `&lt;${this.#closing ? '/' : ''}${this.#tag}`, post: `${this.#selfClosing ? '/' : ''}&gt;`,
		});
	}
}

module.exports = HtmlToken;
