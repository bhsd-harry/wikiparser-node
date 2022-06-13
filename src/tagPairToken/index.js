'use strict';

const {typeError, externalUse} = require('../../util/debug'),
	fixedToken = require('../../mixin/fixedToken'),
	/** @type {Parser} */ Parser = require('../..'),
	Token = require('../token');

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
	 * @param {acceptable} acceptable
	 */
	constructor(name, attr, inner, closing, config = Parser.getConfig(), accum = []) {
		if (typeof name !== 'string' || closing !== undefined && typeof closing !== 'string') {
			typeError('String');
		} else if (!Token.isNode(attr) || !Token.isNode(inner)) {
			typeError('String', 'Token');
		}
		const lcName = name.toLowerCase();
		if (![...config?.ext ?? [], 'includeonly', 'noinclude'].includes(lcName)) {
			throw new RangeError(`非法的标签: ${lcName}！`);
		}
		super(undefined, config);
		this.setAttribute('name', lcName);
		this.selfClosing = closing === undefined;
		this.closed = closing !== '';
		this.#tags = [name, closing || name];
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
	 * @template {TokenAttributeName} T
	 * @param {T} key
	 * @returns {TokenAttribute<T>}
	 */
	getAttribute(key) {
		if (!Parser.debugging && key === 'tags' && externalUse('getAttribute')) {
			throw new RangeError(`使用 ${this.constructor.name}.getAttribute 方法获取私有属性 ${key} 仅用于代码调试！`);
		} else if (key === 'tags') {
			return this.#tags;
		}
		return super.getAttribute(key);
	}

	toString() {
		const {closed, firstChild, lastChild, nextSibling, name, selfClosing} = this,
			[opening, closing] = this.#tags;
		if (!closed && nextSibling) {
			Parser.error(`自动闭合 <${name}>`, lastChild.replaceAll('\n', '\\n'));
			this.closed = true;
		}
		return selfClosing
			? `<${opening}${String(firstChild)}/>`
			: `<${opening}${String(firstChild)}>${String(lastChild)}${closed ? `</${closing}>` : ''}`;
	}

	text() {
		const {closed, firstChild, lastChild, selfClosing} = this,
			[opening, closing] = this.#tags,
			text = /** @param {string|Token} child */ child => typeof child === 'string' ? child : child.text();
		return selfClosing
			? `<${opening}${text(firstChild)}/>`
			: `<${opening}${text(firstChild)}>${text(lastChild)}${closed ? `</${closing}>` : ''}`;
	}
}

Parser.classes.TagPairToken = __filename;
module.exports = TagPairToken;
