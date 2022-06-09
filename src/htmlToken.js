'use strict';

const {typeError, externalUse} = require('../util/debug'),
	fixedToken = require('../mixin/fixedToken'),
	attributeParent = require('../mixin/attributeParent'),
	/** @type {Parser} */ Parser = require('..'),
	Token = require('./token'),
	AttributeToken = require('./attributeToken');

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
	 * @param {Token[]} accum
	 */
	constructor(name, attr, closing, selfClosing, config = Parser.getConfig(), accum = []) {
		if (typeof name !== 'string') {
			typeError('String');
		} else if (!(attr instanceof AttributeToken)) {
			typeError('AttributeToken');
		}
		super(null, config, true, accum, {AttributeToken: 0});
		this.appendChild(attr);
		this.setAttribute('name', name.toLowerCase());
		this.closing = closing;
		this.selfClosing = selfClosing;
		this.#tag = name;
	}

	/** @param {PropertyKey} key */
	getAttribute(key) {
		if (!Parser.debugging && key === 'tag' && externalUse('getAttribute')) {
			throw new RangeError(`使用 ${this.constructor.name}.getAttribute 方法获取私有属性 ${key} 仅用于代码调试！`);
		} else if (key === 'tag') {
			return this.#tag;
		}
		return super.getAttribute(key);
	}

	toString() {
		return `<${this.closing ? '/' : ''}${this.#tag}${super.toString()}${this.selfClosing ? '/' : ''}>`;
	}

	text() {
		return `<${this.closing ? '/' : ''}${this.#tag}${super.text()}${this.selfClosing ? '/' : ''}>`;
	}

	check() {
		const /** @type {ParserConfig} */ {html} = this.getAttribute('config'),
			{name, parentNode, closing, selfClosing} = this,
			string = this.toString().replaceAll('\n', '\\n');
		if (closing && selfClosing) {
			throw new SyntaxError(`同时闭合和自封闭的标签：${string}`);
		} else if (html[2].includes(name) || selfClosing && html[1].includes(name)) { // 自封闭标签
			return;
		} else if (selfClosing && html[0].includes(name)) {
			throw new SyntaxError(`无效自封闭标签：${string}`);
		} else if (!parentNode) {
			return;
		}
		const {children} = parentNode,
			i = children.indexOf(this),
			selector = `html#${name}`;
		let imbalance = 1;
		if (!closing) {
			for (const token of children.slice(i + 1).filter(child => child.matches(selector))) {
				if (token.closing) {
					imbalance--;
				} else {
					imbalance++;
				}
				if (imbalance === 0) {
					return;
				}
			}
			throw new SyntaxError(`未闭合的标签：${string}`);
		}
		for (const token of children.slice(0, i).reverse().filter(child => child.matches(selector))) {
			if (token.closing) {
				imbalance++;
			} else {
				imbalance--;
			}
			if (imbalance === 0) {
				return;
			}
		}
		throw new SyntaxError(`未匹配的闭合标签：${string}`);
	}

	#localMatch() {
		this.selfClosing = false;
		const root = new Token(`</${this.name}>`, this.getAttribute('config')).parse(3);
		this.after(root.firstChild);
	}

	fix() {
		const /** @type {ParserConfig} */ config = this.getAttribute('config'),
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
			imbalance = prevSiblings.reduce((acc, {closing}) => acc + (closing ? -1 : 1), 0);
		if (imbalance > 0) {
			this.selfClosing = false;
			this.closing = true;
		} else {
			Parser.warn(`无法准确判定修复方法：前文平衡计数 ${imbalance}`, this.toString().replaceAll('\n', '\\n'));
			this.#localMatch();
		}
	}

	/** @param {string} tag */
	replaceTag(tag) {
		const /** @type {ParserConfig} */ {html} = this.getAttribute('config'),
			name = tag.toLowerCase();
		if (!html.flat().includes(name)) {
			throw new RangeError(`非法的HTML标签：${tag}`);
		}
		this.setAttribute('name', name).#tag = tag;
	}
}

Parser.classes.HtmlToken = __filename;
module.exports = HtmlToken;
