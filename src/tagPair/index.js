'use strict';

const fixedToken = require('../../mixin/fixedToken'),
	/** @type {Parser} */ Parser = require('../..'),
	Token = require('..');

/**
 * 成对标签
 * @classdesc `{childNodes: [string|AttributeToken, string|Token]}`
 */
class TagPairToken extends fixedToken(Token) {
	selfClosing;
	closed;
	#tags;

	/**
	 * @param {string} name
	 * @param {string|Token} attr
	 * @param {string|Token} inner
	 * @param {string|undefined} closing - 约定`undefined`表示自闭合，`''`表示未闭合
	 * @param {accum} accum
	 */
	constructor(name, attr, inner, closing, config = Parser.getConfig(), accum = []) {
		super(undefined, config);
		this.setAttribute('name', name.toLowerCase()).#tags = [name, closing || name];
		this.selfClosing = closing === undefined;
		this.closed = closing !== '';
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
	 * @template {string} T
	 * @param {T} key
	 * @returns {TokenAttribute<T>}
	 */
	getAttribute(key) {
		if (key === 'tags') {
			return [...this.#tags];
		}
		return super.getAttribute(key);
	}

	toString() {
		const {closed, firstChild, lastChild, nextSibling, name, selfClosing} = this,
			[opening, closing] = this.#tags;
		if (!closed && nextSibling) {
			Parser.error(`自动闭合 <${name}>`, String(lastChild).replaceAll('\n', '\\n'));
			this.closed = true;
		}
		return selfClosing
			? `<${opening}${String(firstChild)}/>`
			: `<${opening}${String(firstChild)}>${String(lastChild)}${closed ? `</${closing}>` : ''}`;
	}

	getPadding() {
		return this.#tags[0].length + 1;
	}

	getGaps() {
		return 1;
	}

	text() {
		const {closed, firstChild, lastChild, selfClosing} = this,
			[opening, closing] = this.#tags,
			text = /** @param {string|Token} child */ child => typeof child === 'string' ? child : child.text();
		return selfClosing
			? `<${opening}${text(firstChild)}/>`
			: `<${opening}${text(firstChild)}>${text(lastChild)}${closed ? `</${closing}>` : ''}`;
	}

	/** @returns {[number, string][]} */
	plain() {
		const {lastChild} = this;
		if (typeof lastChild === 'string') {
			return lastChild ? [[this.getAbsoluteIndex() + this.getRelativeIndex(1), lastChild]] : [];
		}
		return lastChild.plain();
	}
}

Parser.classes.TagPairToken = __filename;
module.exports = TagPairToken;
