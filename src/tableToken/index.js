'use strict';

const {externalUse} = require('../../util/debug'),
	attributeParent = require('../../mixin/attributeParent'),
	/** @type {Parser} */ Parser = require('../..'),
	Token = require('../token');

class TableToken extends attributeParent(Token) {
	#syntax;
	#closing = '';

	/**
	 * @param {'table'|'tr'|'td'} type
	 * @param {string} syntax
	 * @param {accum} accum
	 */
	constructor(type, syntax, attr = '', config = Parser.getConfig(), accum = []) {
		super(undefined, config, true, accum, {String: '1:', Token: '1:', AttributeToken: 0, TableToken: '1:'});
		this.type = type;
		this.#syntax = syntax;
		const AttributeToken = require('../attributeToken');
		this.appendChild(new AttributeToken(attr, 'table-attr', type, accum));
	}

	/**
	 * @template {TokenAttributeName} T
	 * @param {T} key
	 * @returns {TokenAttribute<T>}
	 */
	getAttribute(key) {
		if (key === 'syntax') {
			return this.#syntax;
		} else if (key === 'closing') {
			return this.#closing;
		}
		return super.getAttribute(key);
	}

	/**
	 * @template {TokenAttributeName} T
	 * @param {T} key
	 * @param {TokenAttribute<T>} value
	 */
	setAttribute(key, value) {
		if (!Parser.debugging && ['syntax', 'closing'].includes(key) && externalUse('setAttribute')) {
			throw new RangeError(`使用 ${this.constructor.name}.setAttribute 方法设置私有属性 ${key} 仅用于代码调试！`);
		} else if (key === 'syntax') {
			this.#syntax = String(value);
		} else if (key === 'closing' && this.type === 'table') {
			this.#closing = String(value);
		} else {
			super.setAttribute(key, value);
		}
		return this;
	}

	build() {
		if (this.#syntax.includes('\x00')) {
			this.#syntax = this.buildFromStr(this.#syntax).map(String).join('');
		}
		if (this.#closing.includes('\x00')) {
			this.#closing = this.buildFromStr(this.#closing).map(String).join('');
		}
		return super.build();
	}

	toString(separator = '\n') {
		if (this.type === 'table' && !this.#closing && this.nextSibling) {
			Parser.error('自动闭合表格');
			this.#closing = this.#syntax === '{|' ? '|}' : '{{!}}}';
		}
		return `${this.#syntax}${this.firstElementChild.toString()}${separator}${
			this.childNodes.slice(1).map(String).join('')
		}${this.#closing}`;
	}

	getPadding() {
		return this.#syntax.length;
	}

	/** @type {number} i */
	getGaps(i) {
		return i ? 0 : 1;
	}

	escape() {
		this.#syntax = this.#syntax.replaceAll('|', '{{!}}');
		this.#closing = this.#closing.replaceAll('|', '{{!}}');
		for (const child of this.children) {
			if (child instanceof TableToken) {
				child.escape();
			}
		}
	}
}

Parser.classes.TableToken = __filename;
module.exports = TableToken;
