'use strict';

const {noWrap} = require('../util/string'),
	fixedToken = require('../mixin/fixedToken'),
	attributeParent = require('../mixin/attributeParent'),
	/** @type {Parser} */ Parser = require('..'),
	Token = require('.');

/**
 * HTML标签
 * @classdesc `{childNodes: [AttributeToken]}`
 */
class HtmlToken extends attributeParent(fixedToken(Token)) {
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
		this.setAttribute('name', name.toLowerCase());
		this.closing = closing;
		this.selfClosing = selfClosing;
		this.#tag = name;
	}

	cloneNode() {
		const [attr] = this.cloneChildren(),
			config = this.getAttribute('config');
		return Parser.run(() => new HtmlToken(this.#tag, attr, this.closing, this.selfClosing, config));
	}

	/**
	 * @template {string} T
	 * @param {T} key
	 * @returns {TokenAttribute<T>}
	 */
	getAttribute(key) {
		if (key === 'tag') {
			return this.#tag;
		}
		return super.getAttribute(key);
	}

	toString() {
		return `<${this.closing ? '/' : ''}${this.#tag}${super.toString()}${this.selfClosing ? '/' : ''}>`;
	}

	getPadding() {
		return this.#tag.length + (this.closing ? 2 : 1);
	}

	text() {
		return `<${this.closing ? '/' : ''}${this.#tag}${super.text()}${this.selfClosing ? '/' : ''}>`;
	}

	/** @param {string} tag */
	replaceTag(tag) {
		const name = tag.toLowerCase();
		if (!this.getAttribute('config').html.flat().includes(name)) {
			throw new RangeError(`非法的HTML标签：${tag}`);
		}
		this.setAttribute('name', name).#tag = tag;
	}

	/** @complexity `n` */
	findMatchingTag() {
		const {html} = this.getAttribute('config'),
			{name, parentElement, closing, selfClosing} = this,
			string = noWrap(this.toString());
		if (closing && selfClosing) {
			throw new SyntaxError(`同时闭合和自封闭的标签：${string}`);
		} else if (html[2].includes(name) || selfClosing && html[1].includes(name)) { // 自封闭标签
			return this;
		} else if (selfClosing && html[0].includes(name)) {
			throw new SyntaxError(`无效自封闭标签：${string}`);
		} else if (!parentElement) {
			return;
		}
		const {children} = parentElement,
			i = children.indexOf(this),
			selector = `html#${name}`,
			siblings = closing
				? children.slice(0, i).reverse().filter(child => child.matches(selector))
				: children.slice(i + 1).filter(child => child.matches(selector));
		let imbalance = closing ? -1 : 1;
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
		throw new SyntaxError(`未${closing ? '匹配的闭合' : '闭合的'}标签：${string}`);
	}

	#localMatch() {
		this.selfClosing = false;
		const root = Parser.parse(`</${this.name}>`, false, 3, this.getAttribute('config'));
		this.after(root.firstChild);
	}

	/** @complexity `n` */
	fix() {
		const config = this.getAttribute('config'),
			{parentElement, selfClosing, name, firstElementChild} = this;
		if (!parentElement || !selfClosing || !config.html[0].includes(name)) {
			return;
		} else if (firstElementChild.text().trim()) {
			this.#localMatch();
			return;
		}
		const {children} = parentElement,
			i = children.indexOf(this),
			/** @type {HtmlToken[]} */
			prevSiblings = children.slice(0, i).filter(child => child.matches(`html#${name}`)),
			imbalance = prevSiblings.reduce((acc, {closing}) => acc + (closing ? 1 : -1), 0);
		if (imbalance < 0) {
			this.selfClosing = false;
			this.closing = true;
		} else {
			Parser.warn('无法修复无效自封闭标签', noWrap(this.toString()));
			throw new Error(`无法修复无效自封闭标签：前文共有 ${imbalance} 个未匹配的闭合标签`);
		}
	}
}

Parser.classes.HtmlToken = __filename;
module.exports = HtmlToken;
