'use strict';

const fixedToken = require('../../mixin/fixedToken'),
	Parser = require('../..'),
	Token = require('..');

/**
 * 成对标签
 * @classdesc `{childNodes: [Text|AttributeToken, Text|Token]}`
 */
class TagPairToken extends fixedToken(Token) {
	#selfClosing;
	#closed;
	#tags;

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

	/** getter */
	get closed() {
		return this.#closed;
	}

	set closed(value) {
		this.#closed ||= Boolean(value);
	}

	/** 内部wikitext */
	get innerText() {
		return this.#selfClosing ? undefined : this.lastChild.text();
	}

	/**
	 * @param {string} name 标签名
	 * @param {string|Token} attr 标签属性
	 * @param {string|Token} inner 内部wikitext
	 * @param {string|undefined} closed 是否封闭；约定`undefined`表示自闭合，`''`表示未闭合
	 * @param {accum} accum
	 */
	constructor(name, attr, inner, closed, config = Parser.getConfig(), accum = []) {
		super(undefined, config, true);
		this.setAttribute('name', name.toLowerCase()).#tags = [name, closed || name];
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
	 * @template {string} T
	 * @param {T} key 属性键
	 * @returns {TokenAttribute<T>}
	 */
	getAttribute(key) {
		return key === 'tags' ? [...this.#tags] : super.getAttribute(key);
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

	/** @override */
	getPadding() {
		return this.#tags[0].length + 1;
	}

	/** @override */
	getGaps() {
		return 1;
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
}

Parser.classes.TagPairToken = __filename;
module.exports = TagPairToken;
