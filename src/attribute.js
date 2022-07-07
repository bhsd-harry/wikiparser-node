'use strict';

const {removeComment} = require('../util/string'),
	/** @type {Parser} */ Parser = require('..'),
	Token = require('.');

/**
 * 扩展和HTML标签属性
 * @classdesc `{childNodes: [string]|(string|ArgToken|TranscludeToken)[]}`
 */
class AttributeToken extends Token {
	/** @type {Map<string, string|true>} */ #attr = new Map();

	/**
	 * 从`childNodes`更新`this.#attr`
	 * @complexity `n`
	 */
	#parseAttr() {
		let string = this.toString();
		string = removeComment(string).replace(/\x00\d+~\x7f/g, '=');
		for (const [, key,, quoted, unquoted] of string
			.matchAll(/([^\s/][^\s/=]*)(?:\s*=\s*(?:(["'])(.*?)(?:\2|$)|(\S*)))?/sg)
		) {
			this.setAttr(key, quoted ?? unquoted ?? true, true);
		}
	}

	/**
	 * @param {string} attr
	 * @param {'ext-attr'|'html-attr'|'table-attr'} type
	 * @param {string} name
	 * @param {accum} accum
	 */
	constructor(attr, type, name, config = Parser.getConfig(), accum = []) {
		super(attr, config, type !== 'ext-attr', accum);
		this.type = type;
		this.#parseAttr();
	}

	/**
	 * @template {string|undefined} T
	 * @param {T} key
	 * @returns {T extends string ? string|true : Record<string, string|true>}
	 */
	getAttr(key) {
		return this.#attr.get(key.toLowerCase().trim());
	}

	/**
	 * @param {string} key
	 * @param {string|boolean} value
	 * @complexity `n`
	 */
	setAttr(key, value) {
		key = key.toLowerCase().trim();
		if (/^(?:[\w:]|\x00\d+[t!~{}+-]\x7f)(?:[\w:.-]|\x00\d+[t!~{}+-]\x7f)*$/.test(key)) {
			this.#attr.set(key, value === true ? true : value.replace(/\s/g, ' ').trim());
		}
	}
}

module.exports = AttributeToken;
