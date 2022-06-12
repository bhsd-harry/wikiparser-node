'use strict';

const hidden = require('../mixin/hidden'),
	fixedToken = require('../mixin/fixedToken'),
	{externalUse, typeError} = require('../util/debug'),
	/** @type {Parser} */ Parser = require('..'),
	Token = require('./token');

/**
 * `<includeonly>`或`<noinclude>`
 * @classdesc `{childNodes: [string]}`
 */
class IncludeToken extends hidden(fixedToken(Token)) {
	type = 'include';
	selfClosing;
	closed;
	#tags;

	/**
	 * @param {string} name
	 * @param {string|undefined} inner
	 * @param {accum} accum
	 */
	constructor(name, attr = '', inner = undefined, closing = '', accum = []) {
		if (typeof name !== 'string' || typeof attr !== 'string'
			|| inner !== undefined && typeof inner !== 'string' || typeof closing !== 'string'
		) {
			typeError('String');
		} else if (!['includeonly', 'noinclude'].includes(name.toLowerCase())) {
			throw new RangeError('IncludeToken 仅用于 <includeonly> 和 <noinclude>！');
		}
		super(undefined, null, false, accum, {String: [0, 1]});
		this.setAttribute('name', name.toLowerCase());
		this.selfClosing = inner === undefined;
		this.closed = inner === undefined || Boolean(closing);
		this.#tags = [name, closing || name];
		this.append(attr, inner ?? '');
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
		const {closed, firstChild, lastChild, nextSibling, name, selfClosing} = this;
		if (!closed && nextSibling) {
			Parser.error(`自动闭合<${name}>`);
			this.closed = true;
		}
		return selfClosing
			? `<${this.#tags[0]}${firstChild}/>`
			: `<${this.#tags[0]}${firstChild}>${lastChild}${closed ? `</${this.#tags[1]}>` : ''}`;
	}

	/** @param {string} str */
	setText(str) {
		super.setText(str, 1);
	}

	removeAttr() {
		super.setText('', 0);
	}
}

Parser.classes.IncludeToken = __filename;
module.exports = IncludeToken;
