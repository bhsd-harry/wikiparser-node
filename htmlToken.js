'use strict';
const Token = require('./token'),
	AtomToken = require('./atomToken'),
	AttributeToken = require('./attributeToken');
const {typeError, fixToken} = require('./util');

/** @content AttributeToken */
class HtmlToken extends fixToken(AtomToken) {
	name;
	closing;
	selfClosing;
	#tag;
	#toBeClosed = false;

	/**
	 * @param {string} name
	 * @param {AttributeToken} attr
	 * @param {boolean} closing
	 * @param {boolean} selfClosing
	 * @param {Token[]} accum
	 */
	constructor(name, attr, closing, selfClosing, config = require(Token.config), accum = []) {
		if (typeof name !== 'string' || !(attr instanceof AttributeToken)) {
			typeError('String', 'AttributeToken');
		}
		super([], 'html', null, accum, ['AttributeToken']);
		this.$children.push(attr);
		this.name = name.toLowerCase();
		this.closing = closing;
		this.selfClosing = selfClosing;
		this.#tag = name;
		this.set('config', config);
		this.seal();
	}

	toString() {
		return `<${this.closing ? '/' : ''}${this.#tag}${
			this.$children[0].toString()
		}${this.selfClosing ? '/' : ''}>${this.#toBeClosed ? `</${this.name}>` : ''}`;
	}

	rename(tag) {
		this.name = tag.toLowerCase();
		this.#tag = tag;
	}

	/** 只按照解析器的实际处理方式修复，可能不是代码本意 */
	fix() {
		if (!this.selfClosing) {
			return;
		}
		const [, single, singleOnly] = this.get('config').html;
		if (singleOnly.includes(this.name)) {
			return;
		}
		this.selfClosing = false;
		if (single.includes(this.name)) {
			this.#toBeClosed = true;
		}
	}

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

Token.classes.HtmlToken = HtmlToken;

module.exports = HtmlToken;
