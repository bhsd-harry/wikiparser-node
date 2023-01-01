'use strict';

const /** @type {Parser} */ Parser = require('../..'),
	NowikiToken = require('.');

/**
 * `<hr>`
 * @classdesc `{childNodes: [string]}`
 */
class QuoteToken extends NowikiToken {
	type = 'quote';

	/**
	 * @param {number} n 字符串长度
	 * @param {accum} accum
	 */
	constructor(n, config = Parser.getConfig(), accum = []) {
		super("'".repeat(n), config, accum);
		this.setAttribute('name', String(n));
	}

	/**
	 * @override
	 * @param {string} str 新文本
	 * @throws `RangeError` 错误的单引号语法
	 */
	setText(str) {
		if (str !== "''" && str !== "'''" && str !== "'''''") {
			throw new RangeError(`${this.constructor.name} 的内部文本只能为连续 2/3/5 个"'"！`);
		}
		return super.setText(str);
	}
}

Parser.classes.QuoteToken = __filename;
module.exports = QuoteToken;
