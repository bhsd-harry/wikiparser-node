'use strict';
const Token = require('./token'),
	FixedToken = require('./fixedToken'),
	AttributeToken = require('./attributeToken');
const {typeError} = require('./util');

/**
 * @content AttributeToken
 * @content Token|AtomToken
 */
class ExtToken extends FixedToken {
	type = 'ext';
	name;
	selfClosing;
	/** @type {string[]} */ tags;

	/**
	 * @param {string} name
	 * @param {string} attr
	 * @param {string|true} inner
	 * @param {Token[]} accum
	 */
	constructor(name, attr, inner, config = require(Token.config), accum = []) {
		if (typeof name !== 'string' || typeof attr !== 'string' || inner !== true && typeof inner !== 'string') {
			typeError('String');
		} else if (typeof inner === 'string' && !new RegExp(`</${name}>$`, 'i').test(inner)) {
			throw new RangeError('非自封闭标签需要匹配标签对！');
		}
		super(null, null, true, null, accum, ['AttributeToken', 'AtomToken']);
		this.name = name.toLowerCase();
		this.selfClosing = inner === true;
		this.tags = this.selfClosing ? [name] : [name, inner.slice(-1 - name.length, -1)];
		new AttributeToken(!attr || /^\s/.test(attr) ? attr : ` ${attr}`, this);
		const /** @type {string} */ extInner = this.selfClosing ? '' : inner.slice(0, -3 - name.length);
		let innerToken;
		switch (this.name) {
			case 'ref':
				this.set('acceptable', ['AttributeToken', 'Token']);
				innerToken = new Token(extInner, config, true, this, accum);
				break;
			case 'nowiki': {
				this.set('acceptable', ['AttributeToken', 'NowikiToken']);
				const NowikiToken = require('./nowikiToken');
				innerToken = new NowikiToken(extInner, this);
				break;
			}
			/*
			 * 更多定制扩展的代码示例：
			 * case 'extensionName':
			 * 	this.set('acceptable', ['AttributeToken', 'ExtensionNameToken']);
			 * 	innerToken = new ExtensionNameToken(extInner, config, this, accum);
			 * 	break;
			 */
			default: {
				const AtomToken = require('./atomToken');
				innerToken = new AtomToken(extInner, this);
			}
		}
		// 可能多余，但无妨
		innerToken.type = 'ext-inner';
		innerToken.name = this.name;
		this.freeze(['name', 'tags']).seal();
	}

	// ------------------------------ extended superclass ------------------------------ //

	toString() {
		const {selfClosing, tags, $children: [attr, inner]} = this;
		return selfClosing
			? `<${tags[0]}${attr}/>`
			: `<${tags[0]}${attr}>${inner}</${tags[1] ?? tags[0]}>`;
	}

	hide() {
		this.selfClosing = true;
		return this;
	}

	empty() {
		return this.hide();
	}

	show(inner) {
		if (inner !== undefined) {
			this.$children[1].replaceWith(inner);
		}
		this.selfClosing = false;
		return this;
	}

	// ------------------------------ attribute modification ------------------------------ //

	/** @param {string|undefined} key */
	getAttr(key) {
		const /** @type {[AttributeToken]} */ [attr] = this;
		return attr.getAttr(key);
	}

	/** @param {string|undefined} key */
	removeAttr(key) {
		const /** @type {[AttributeToken]} */ [attr] = this;
		attr.removeAttr(key);
		return this;
	}

	/**
	 * @param {string} key
	 * @param {string|number|true|undefined} value
	 */
	setAttr(key, value) {
		const /** @type {[AttributeToken]} */ [attr] = this;
		attr.setAttr(key, value);
		return this;
	}
}

Token.classes.ExtToken = ExtToken;

module.exports = ExtToken;
