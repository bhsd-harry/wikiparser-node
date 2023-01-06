'use strict';

const Parser = require('../..'),
	NowikiToken = require('.');

/**
 * `<hr>`
 * @classdesc `{childNodes: [Text]}`
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
		if (str === "''" || str === "'''" || str === "'''''") {
			return super.setText(str);
		}
		throw new RangeError(`${this.constructor.name} 的内部文本只能为连续 2/3/5 个"'"！`);
	}
}

Parser.classes.QuoteToken = __filename;
module.exports = QuoteToken;
