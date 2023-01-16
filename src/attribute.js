'use strict';

const {generateForSelf} = require('../util/lint'),
	{removeComment} = require('../util/string'),
	Parser = require('..'),
	Token = require('.');

/**
 * 扩展和HTML标签属性
 * @classdesc `{childNodes: [AstText]|(AstText|ArgToken|TranscludeToken)[]}`
 */
class AttributeToken extends Token {
	/** @type {Map<string, string|true>} */ #attr = new Map();
	#sanitized = true;
	#quoteBalance = true;

	/**
	 * 从`childNodes`更新`this.#attr`
	 * @complexity `n`
	 */
	#parseAttr() {
		let string = this.toString();
		string = removeComment(string).replaceAll(/\0\d+~\x7F/gu, '=');
		for (const [, key, quoteStart, quoted, quoteEnd, unquoted] of string
			.matchAll(/([^\s/][^\s/=]*)(?:\s*=\s*(?:(["'])(.*?)(\2|$)|(\S*)))?/gsu)
		) {
			if (!this.setAttr(key, quoted ?? unquoted ?? true, true)) {
				this.#sanitized = false;
			} else if (quoteStart !== quoteEnd) {
				this.#quoteBalance = false;
			}
		}
	}

	/**
	 * @param {string} attr 标签属性
	 * @param {'ext-attr'|'html-attr'|'table-attr'} type 标签类型
	 * @param {string} name 标签名
	 * @param {accum} accum
	 */
	constructor(attr, type, name, config = Parser.getConfig(), accum = []) {
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
	 * @param {boolean} init 是否是初次解析
	 * @complexity `n`
	 */
	setAttr(key, value, init) {
		key = key.toLowerCase().trim();
		const parsedKey = key;
		if (!/^(?:[\w:]|\0\d+[t!~{}+-]\x7F)(?:[\w:.-]|\0\d+[t!~{}+-]\x7F)*$/u.test(parsedKey)) {
			if (init) {
				return false;
			}
			return false;
		} else if (value === false) {
			this.#attr.delete(key);
		} else {
			this.#attr.set(key, value === true ? true : value.replaceAll(/\s/gu, ' ').trim());
		}
		return true;
	}

	/**
	 * @override
	 * @this {AttributeToken & {parentNode: HtmlToken}}
	 * @param {number} start 起始位置
	 */
	lint(start = 0) {
		const HtmlToken = require('./html');
		const errors = super.lint(start);
		let /** @type {{top: number, left: number}} */ rect;
		if (this.type === 'html-attr' && this.parentNode.closing && String(this).trim()) {
			rect = this.getRootNode().posFromIndex(start);
			errors.push(generateForSelf(this, rect, '位于闭合标签的属性'));
		}
		if (!this.#sanitized) {
			rect ||= this.getRootNode().posFromIndex(start);
			errors.push(generateForSelf(this, rect, '包含无效属性'));
		} else if (!this.#quoteBalance) {
			rect ||= this.getRootNode().posFromIndex(start);
			errors.push(generateForSelf(this, rect, '未闭合的引号', 'warning'));
		}
		return errors;
	}
}

module.exports = AttributeToken;
