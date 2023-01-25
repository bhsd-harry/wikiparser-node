'use strict';

const {generateForChild} = require('../util/lint'),
	{removeComment} = require('../util/string'),
	Parser = require('..'),
	Token = require('.'),
	AtomToken = require('./atom');

/**
 * 扩展和HTML标签属性
 * @classdesc `{childNodes: [AtomToken, Token|AtomToken]}`
 */
class AttributeToken extends Token {
	#equal;
	#quotes;

	/** 引号是否匹配 */
	get balanced() {
		return !this.#equal || this.#quotes[0] === this.#quotes[1];
	}

	/**
	 * @param {'ext-attr'|'html-attr'|'table-attr'} type 标签类型
	 * @param {string} key 属性名
	 * @param {string} equal 等号
	 * @param {string} value 属性值
	 * @param {string[]} quotes 引号
	 * @param {accum} accum
	 */
	constructor(type, key, equal = '', value = '', quotes = [], config = Parser.getConfig(), accum = []) {
		const keyToken = new AtomToken(key, 'attr-key', config, accum, {
			}),
			valueToken = key === 'title'
				? new Token(value, config, true, accum, {
				}).setAttribute('type', 'attr-value').setAttribute('stage', Parser.MAX_STAGE - 1)
				: new AtomToken(value, 'attr-value', config, accum, {
				});
		super(undefined, config, true, accum);
		this.type = type;
		this.append(keyToken, valueToken);
		this.#equal = equal;
		this.#quotes = quotes;
		this.setAttribute('name', removeComment(key).trim());
	}

	/** @override */
	afterBuild() {
		if (this.#equal.includes('\0')) {
			this.#equal = this.getAttribute('buildFromStr')(this.#equal, 'string');
		}
	}

	/**
	 * @override
	 * @returns {string}
	 */
	toString(selector) {
		const [quoteStart = '', quoteEnd = ''] = this.#quotes;
		return this.#equal
			? `${super.toString(selector, `${this.#equal}${quoteStart}`)}${quoteEnd}`
			: this.firstChild.toString(selector);
	}

	/**
	 * @override
	 * @returns {string}
	 */
	text() {
		return this.#equal ? `${super.text(`${this.#equal.trim()}"`)}"` : this.firstChild.text();
	}

	/** @override */
	getGaps() {
		return this.#equal ? this.#equal.length + (this.#quotes[0]?.length ?? 0) : 0;
	}

	/** @override */
	print() {
		const [quoteStart = '', quoteEnd = ''] = this.#quotes;
		return this.#equal ? super.print({sep: `${this.#equal}${quoteStart}`, post: quoteEnd}) : super.print();
	}

	/**
	 * @override
	 * @param {number} start 起始位置
	 */
	lint(start = 0) {
		const errors = super.lint(start);
		if (!this.balanced) {
			const {lastChild} = this,
				e = generateForChild(lastChild, {token: this, start}, '未闭合的引号', 'warning');
			errors.push({...e, startCol: e.startCol - 1});
		}
		return errors;
	}

	/** 获取属性值 */
	getValue() {
		if (this.#equal) {
			const value = this.lastChild.text();
			return value;
		}
		return true;
	}
}

module.exports = AttributeToken;
