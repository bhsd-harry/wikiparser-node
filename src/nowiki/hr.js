'use strict';

const sol = require('../../mixin/sol'),
	/** @type {Parser} */ Parser = require('../..'),
	NowikiToken = require('.');

/**
 * `<hr>`
 * @classdesc `{childNodes: [string]}`
 */
class HrToken extends sol(NowikiToken) {
	type = 'hr';

	/**
	 * @param {number} n 字符串长度
	 * @param {accum} accum
	 */
	constructor(n, config = Parser.getConfig(), accum = []) {
		super('-'.repeat(n), config, accum);
	}

	/** @override */
	cloneNode() {
		return Parser.run(() => new HrToken(String(this).length, this.getAttribute('config')));
	}

	/**
	 * @override
	 * @param {string} str 新文本
	 * @throws `RangeError` 错误的\<hr\>语法
	 */
	setText(str) {
		if (str.length < 4 || /[^-]/u.test(str)) {
			throw new RangeError('<hr>总是写作不少于4个的连续"-"！');
		}
		return super.setText(str);
	}
}

Parser.classes.HrToken = __filename;
module.exports = HrToken;
