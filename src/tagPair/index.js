'use strict';

/**
 * @template T
 * @typedef {import('../../lib/node').TokenAttribute<T>} TokenAttribute
 */

const Parser = require('../..'),
	fixedToken = require('../../mixin/fixedToken'),
	Token = require('..');

/**
 * 成对标签
 * @classdesc `{childNodes: [AstText|AttributesToken, AstText|Token]}`
 */
class TagPairToken extends fixedToken(Token) {
	#selfClosing;
	#closed;
	#tags;

	/** getter */
	get closed() {
		return this.#closed;
	}

	set closed(value) {
		this.#closed ||= Boolean(value);
	}

	/** getter */
	get selfClosing() {
		return this.#selfClosing;
	}

	set selfClosing(value) {
		value = Boolean(value);
		if (value !== this.#selfClosing && this.lastChild.text()) {
			Parser.warn(`<${this.name}>标签内部的${value ? '文本将被隐藏' : '原有文本将再次可见'}！`);
		}
		this.#selfClosing = value;
	}

	/** 内部wikitext */
	get innerText() {
		return this.#selfClosing ? undefined : this.lastChild.text();
	}

	/**
	 * @param {string} name 标签名
	 * @param {string|Token} attr 标签属性
	 * @param {string|Token} inner 内部wikitext
	 * @param {string} closed 是否封闭；约定`undefined`表示自闭合，`''`表示未闭合
	 * @param {Token[]} accum
	 */
	constructor(name, attr, inner, closed, config = Parser.getConfig(), accum = []) {
		super(undefined, config, true);
		this.setAttribute('name', name.toLowerCase());
		this.#tags = [name, closed || name];
		this.#selfClosing = closed === undefined;
		this.#closed = closed !== '';
		this.append(attr, inner);
		let index = accum.indexOf(attr);
		if (index === -1) {
			index = accum.indexOf(inner);
		}
		if (index === -1) {
			index = Infinity;
		}
		accum.splice(index, 0, this);
	}

	/**
	 * @override
	 * @param {string} selector
	 */
	toString(selector) {
		const {firstChild, lastChild, nextSibling, name} = this,
			[opening, closing] = this.#tags;
		if (selector && this.matches(selector)) {
			return '';
		} else if (!this.#closed && nextSibling) {
			Parser.error(`自动闭合 <${name}>`, lastChild);
			this.#closed = true;
		}
		return this.#selfClosing
			? `<${opening}${String(firstChild)}/>`
			: `<${opening}${String(firstChild)}>${String(lastChild)}${this.#closed ? `</${closing}>` : ''}`;
	}

	/**
	 * @override
	 * @returns {string}
	 */
	text() {
		const [opening, closing] = this.#tags;
		return this.#selfClosing
			? `<${opening}${this.firstChild.text()}/>`
			: `<${opening}${super.text('>')}${this.#closed ? `</${closing}>` : ''}`;
	}

	/** @override */
	getPadding() {
		return this.#tags[0].length + 1;
	}

	/** @override */
	getGaps() {
		return 1;
	}

	/** @override */
	print() {
		const [opening, closing] = this.#tags;
		return super.print(this.#selfClosing
			? {pre: `&lt;${opening}`, post: '/&gt;'}
			: {pre: `&lt;${opening}`, sep: '&gt;', post: this.#closed ? `&lt;/${closing}&gt;` : ''});
	}

	/**
	 * @override
	 * @template {string} T
	 * @param {T} key 属性键
	 * @returns {TokenAttribute<T>}
	 */
	getAttribute(key) {
		return key === 'tags' ? [...this.#tags] : super.getAttribute(key);
	}
}

Parser.classes.TagPairToken = __filename;
module.exports = TagPairToken;
