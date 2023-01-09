'use strict';

const {generateForSelf} = require('../util/lint'),
	Parser = require('..'),
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
		this.setAttribute('name', name.toLowerCase());
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

	/**
	 * @override
	 * @param {number} start 起始位置
	 */
	lint(start = 0) {
		const errors = super.lint(start);
		try {
			this.findMatchingTag();
		} catch ({message: errorMsg}) {
			const rect = this.getRootNode().posFromIndex(start),
				[message] = errorMsg.split('：');
			errors.push(generateForSelf(this, rect, message, message[0] === '未' ? 'warning' : 'error'));
		}
		return errors;
	}

	/**
	 * 搜索匹配的标签
	 * @complexity `n`
	 * @throws `SyntaxError` 同时闭合和自封闭的标签
	 * @throws `SyntaxError` 无效自封闭标签
	 * @throws `SyntaxError` 未闭合的标签
	 */
	findMatchingTag() {
		const {html} = this.getAttribute('config'),
			{name: tagName, parentNode} = this,
			string = String(this);
		if (this.#closing && this.#selfClosing) {
			throw new SyntaxError(`同时闭合和自封闭的标签：${string}`);
		} else if (html[2].includes(tagName) || this.#selfClosing && html[1].includes(tagName)) { // 自封闭标签
			return this;
		} else if (this.#selfClosing && html[0].includes(tagName)) {
			throw new SyntaxError(`无效自封闭标签：${string}`);
		} else if (!parentNode) {
			return undefined;
		}
		const {childNodes} = parentNode,
			i = childNodes.indexOf(this),
			siblings = this.#closing
				? childNodes.slice(0, i).reverse().filter(({type, name}) => type === 'html' && name === tagName)
				: childNodes.slice(i + 1).filter(({type, name}) => type === 'html' && name === tagName);
		let imbalance = this.#closing ? -1 : 1;
		for (const token of siblings) {
			if (token.closing) {
				imbalance--;
			} else {
				imbalance++;
			}
			if (imbalance === 0) {
				return token;
			}
		}
		throw new SyntaxError(`未${this.#closing ? '匹配的闭合' : '闭合的'}标签：${string}`);
	}
}

module.exports = HtmlToken;
