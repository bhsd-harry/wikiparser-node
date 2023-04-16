'use strict';

const {generateForSelf} = require('../util/lint'),
	Parser = require('..'),
	Token = require('.');

const magicWords = new Set(['if', 'ifeq', 'ifexpr', 'ifexist', 'iferror', 'switch']);

/**
 * HTML标签
 * @classdesc `{childNodes: [AttributesToken]}`
 */
class HtmlToken extends Token {
	/** @type {'html'} */ type = 'html';
	#closing;
	#selfClosing;
	#tag;

	/** getter */
	get closing() {
		return this.#closing;
	}

	/**
	 * @param {string} name 标签名
	 * @param {import('./attributes')} attr 标签属性
	 * @param {boolean} closing 是否闭合
	 * @param {boolean} selfClosing 是否自封闭
	 * @param {Token[]} accum
	 */
	constructor(name, attr, closing, selfClosing, config = Parser.getConfig(), accum = []) {
		super(undefined, config, true, accum);
		this.insertAt(attr);
		this.setAttribute('name', name.toLowerCase());
		this.#closing = closing;
		this.#selfClosing = selfClosing;
		this.#tag = name;
	}

	/**
	 * @override
	 */
	toString(selector) {
		return `<${this.#closing ? '/' : ''}${this.#tag}${super.toString()}${this.#selfClosing ? '/' : ''}>`;
	}

	/** @override */
	text() {
		return `<${this.#closing ? '/' : ''}${this.#tag}${
			this.#closing ? '' : super.text()
		}${this.#selfClosing ? '/' : ''}>`;
	}

	/** @override */
	getPadding() {
		return this.#tag.length + (this.#closing ? 2 : 1);
	}

	/**
	 * @override
	 * @param {number} start 起始位置
	 */
	lint(start) {
		const errors = super.lint(start);
		let /** @type {import('..').LintError} */ refError;
		if (this.name === 'h1' && !this.#closing) {
			refError = generateForSelf(this, {start}, '<h1>');
			errors.push(refError);
		}
		if (this.closest('table-attrs')) {
			refError ||= generateForSelf(this, {start}, '');
			errors.push({...refError, message: Parser.msg('HTML tag in table attributes')});
		}
		try {
			this.findMatchingTag();
		} catch ({message: errorMsg}) {
			refError ||= generateForSelf(this, {start}, '');
			const [msg] = errorMsg.split(':'),
				error = {...refError, message: Parser.msg(msg)};
			if (msg === 'unclosed tag') {
				error.severity = 'warning';
			} else if (msg === 'unmatched closing tag' && magicWords.has(this.closest('magic-word')?.name)) {
				error.severity = 'warning';
			}
			errors.push(error);
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
		if (this.#closing && (this.#selfClosing || html[2].includes(tagName))) {
			throw new SyntaxError(`tag that is both closing and self-closing: ${string}`);
		} else if (html[2].includes(tagName) || this.#selfClosing && html[1].includes(tagName)) { // 自封闭标签
			return this;
		} else if (this.#selfClosing && html[0].includes(tagName)) {
			throw new SyntaxError(`invalid self-closing tag: ${string}`);
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
		throw new SyntaxError(`${this.#closing ? 'unmatched closing' : 'unclosed'} tag: ${string}`);
	}
}

module.exports = HtmlToken;
