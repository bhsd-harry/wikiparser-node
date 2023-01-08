'use strict';

const {removeComment} = require('../util/string'),
	Parser = require('..'),
	Token = require('.');

/**
 * 扩展和HTML标签属性
 * @classdesc `{childNodes: [AstText]|(AstText|ArgToken|TranscludeToken)[]}`
 */
class AttributeToken extends Token {
	/** @type {Map<string, string|true>} */ #attr = new Map();

	/**
	 * 从`childNodes`更新`this.#attr`
	 * @complexity `n`
	 */
	#parseAttr() {
		let string = this.toString();
		string = removeComment(string).replaceAll(/\0\d+~\x7F/gu, '=');
		for (const [, key,, quoted, unquoted] of string
			.matchAll(/([^\s/][^\s/=]*)(?:\s*=\s*(?:(["'])(.*?)(?:\2|$)|(\S*)))?/gsu)
		) {
			this.setAttr(key, quoted ?? unquoted ?? true, true);
		}
	}

	/**
	 * @param {string} attr 标签属性
	 * @param {'ext-attr'|'html-attr'|'table-attr'} type 标签类型
	 * @param {accum} accum
	 */
	constructor(attr, type, config = Parser.getConfig(), accum = []) {
		super(attr, config, true, accum);
		this.type = type;
		this.#parseAttr();
	}

	/**
	 * 获取标签属性
	 * @template {string|undefined} T
	 * @param {T} key 属性键
	 * @returns {T extends string ? string|true : Record<string, string|true>}
	 */
	getAttr(key) {
		return this.#attr.get(key.toLowerCase().trim());
	}

	/**
	 * 设置标签属性
	 * @param {string} key 属性键
	 * @param {string|boolean} value 属性值
	 * @complexity `n`
	 */
	setAttr(key, value) {
		key = key.toLowerCase().trim();
		if (/^(?:[\w:]|\0\d+[t!~{}+-]\x7F)(?:[\w:.-]|\0\d+[t!~{}+-]\x7F)*$/u.test(key)) {
			this.#attr.set(key, value === true ? true : value.replaceAll(/\s/gu, ' ').trim());
		}
	}
}

module.exports = AttributeToken;
