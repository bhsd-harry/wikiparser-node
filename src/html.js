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
	#closing;
	#selfClosing;
	#tag;

	/** getter */
	get closing() {
		return this.#closing;
	}

	/** @throws `Error` 自闭合标签或空标签 */
	set closing(value) {
		if (!value) {
			this.#closing = false;
			return;
		} else if (this.selfClosing) {
			throw new Error(`这是一个自闭合标签！`);
		}
		const {html: [,, tags]} = this.getAttribute('config');
		if (tags.includes(this.name)) {
			throw new Error(`这是一个空标签！`);
		}
		this.#closing = true;
	}

	/** getter */
	get selfClosing() {
		return this.#selfClosing;
	}

	/** @throws `Error` 闭合标签或无效自闭合标签 */
	set selfClosing(value) {
		const {closing, name} = this;
		if (!value) {
			this.#selfClosing = false;
			return;
		} else if (closing) {
			throw new Error('这是一个闭合标签！');
		}
		const {html: [tags]} = this.getAttribute('config');
		if (tags.includes(name)) {
			throw new Error(`<${name}>标签自闭合无效！`);
		}
		this.#selfClosing = true;
	}

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
	cloneNode() {
		const [attr] = this.cloneChildren(),
			config = this.getAttribute('config');
		return Parser.run(() => new HtmlToken(this.#tag, attr, this.closing, this.selfClosing, config));
	}

	/**
	 * @override
	 * @template {string} T
	 * @param {T} key 属性键
	 * @returns {TokenAttribute<T>}
	 */
	getAttribute(key) {
		return key === 'tag' ? this.#tag : super.getAttribute(key);
	}

	/**
	 * @override
	 * @param {string} selector
	 */
	toString(selector) {
		return selector && this.matches(selector)
			? ''
			: `<${this.closing ? '/' : ''}${this.#tag}${super.toString(selector)}${this.selfClosing ? '/' : ''}>`;
	}

	/** @override */
	getPadding() {
		return this.#tag.length + (this.closing ? 2 : 1);
	}

	/** @override */
	text() {
		return `<${this.closing ? '/' : ''}${this.#tag}${super.text()}${this.selfClosing ? '/' : ''}>`;
	}

	/**
	 * 更换标签名
	 * @param {string} tag 标签名
	 * @throws `RangeError` 非法的HTML标签
	 */
	replaceTag(tag) {
		const name = tag.toLowerCase();
		if (!this.getAttribute('config').html.flat().includes(name)) {
			throw new RangeError(`非法的HTML标签：${tag}`);
		}
		this.setAttribute('name', name).#tag = tag;
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
			{name, parentNode, closing, selfClosing} = this,
			string = noWrap(String(this));
		if (closing && selfClosing) {
			throw new SyntaxError(`同时闭合和自封闭的标签：${string}`);
		} else if (html[2].includes(name) || selfClosing && html[1].includes(name)) { // 自封闭标签
			return this;
		} else if (selfClosing && html[0].includes(name)) {
			throw new SyntaxError(`无效自封闭标签：${string}`);
		} else if (!parentNode) {
			return undefined;
		}
		const {children} = parentNode,
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

	/** 局部闭合 */
	#localMatch() {
		this.#selfClosing = false;
		const root = Parser.parse(`</${this.name}>`, false, 3, this.getAttribute('config'));
		this.after(root.firstChild);
	}

	/**
	 * 修复无效自封闭标签
	 * @complexity `n`
	 * @throws `Error` 无法修复无效自封闭标签
	 */
	fix() {
		const config = this.getAttribute('config'),
			{parentNode, selfClosing, name, firstElementChild} = this;
		if (!parentNode || !selfClosing || !config.html[0].includes(name)) {
			return;
		} else if (firstElementChild.text().trim()) {
			this.#localMatch();
			return;
		}
		const {children} = parentNode,
			i = children.indexOf(this),
			/** @type {HtmlToken[]} */
			prevSiblings = children.slice(0, i).filter(child => child.matches(`html#${name}`)),
			imbalance = prevSiblings.reduce((acc, {closing}) => acc + (closing ? 1 : -1), 0);
		if (imbalance < 0) {
			this.#selfClosing = false;
			this.#closing = true;
		} else {
			Parser.warn('无法修复无效自封闭标签', noWrap(String(this)));
			throw new Error(`无法修复无效自封闭标签：前文共有 ${imbalance} 个未匹配的闭合标签`);
		}
	}
}

Parser.classes.HtmlToken = __filename;
module.exports = HtmlToken;
