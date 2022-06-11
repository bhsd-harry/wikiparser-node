'use strict';

const {typeError, externalUse} = require('../util/debug'),
	fixedToken = require('../mixin/fixedToken'),
	attributeParent = require('../mixin/attributeParent'),
	/** @type {Parser} */ Parser = require('..'),
	Token = require('./token'),
	AttributeToken = require('./attributeToken');

/**
 * 扩展标签
 * @classdesc `{childNodes: [AttributeToken, NowikiToken|Token]}`
 */
class ExtToken extends attributeParent(fixedToken(Token)) {
	type = 'ext';
	selfClosing;
	#tags;

	/**
	 * @param {string} name
	 * @param {string|undefined} inner
	 * @param {accum} accum
	 */
	constructor(name, attr = '', inner = undefined, closing = '', config = Parser.getConfig(), accum = []) {
		if (typeof name !== 'string' || typeof attr !== 'string'
			|| inner !== undefined && typeof inner !== 'string' || typeof closing !== 'string'
		) {
			typeError('String');
		}
		super(undefined, null, false, accum, {AttributeToken: 0, NowikiToken: 1});
		this.setAttribute('name', name.toLowerCase());
		this.selfClosing = inner === undefined;
		this.#tags = [name, closing || name];
		const attrToken = new AttributeToken(!attr || /^\s/.test(attr) ? attr : ` ${attr}`, 'ext-attr', this.name),
			newConfig = structuredClone(config),
			ext = new Set(newConfig.ext);
		let innerToken;
		switch (this.name) {
			case 'choose':
				ext.add('option');
				// fall through
			case 'ref':
			case 'option':
			case 'poem':
			case 'indicator':
			case 'tab':
			case 'tabs':
			case 'pre':
			case 'includeonly':
			case 'onlyinclude':
				this.setAttribute('acceptable', {AttributeToken: 0, Token: 1});
				ext.delete(this.name);
				newConfig.ext = [...ext];
				innerToken = new Token(inner, newConfig, false, accum);
				break;
			/*
			 * 更多定制扩展的代码示例：
			 * case 'extensionName':
			 * 	this.setAttribute('acceptable', {AttributeToken: 0, ExtensionNameToken: 1});
			 * 	ext.delete(this.name);
			 * 	newConfig.ext = [...ext];
			 * 	innerToken = new ExtensionNameToken(extInner, newConfig, false, accum);
			 * 	break;
			 */
			default: {
				const NowikiToken = require('./nowikiToken');
				innerToken = new NowikiToken(inner);
			}
		}
		innerToken.type = 'ext-inner';
		if (this.name === 'pre') {
			innerToken.setAttribute('stage', Parser.MAX_STAGE - 1);
		}
		innerToken.setAttribute('name', this.name);
		this.append(attrToken, innerToken);
	}

	/** @param {PropertyKey} key */
	getAttribute(key) {
		if (!Parser.debugging && key === 'tags' && externalUse('getAttribute')) {
			throw new RangeError(`使用 ${this.constructor.name}.getAttribute 方法获取私有属性 ${key} 仅用于代码调试！`);
		} else if (key === 'tags') {
			return this.#tags;
		}
		return super.getAttribute(key);
	}

	toString() {
		const [attr, inner] = this.children;
		return this.selfClosing
			? `<${this.#tags[0]}${attr.toString()}/>`
			: `<${this.#tags[0]}${attr.toString()}>${inner.toString()}</${this.#tags[1]}>`;
	}

	text() {
		const [attr, inner] = this.children;
		return this.selfClosing
			? `<${this.#tags[0]}${attr.text()}/>`
			: `<${this.#tags[0]}${attr.text()}>${inner.text()}</${this.#tags[1]}>`;
	}
}

Parser.classes.ExtToken = __filename;
module.exports = ExtToken;
