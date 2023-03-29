'use strict';

const Parser = require('../..'),
	sol = require('../../mixin/sol'),
	NowikiToken = require('.');

/**
 * `<hr>`
 * @classdesc `{childNodes: [AstText]}`
 */
class HrToken extends sol(NowikiToken) {
	type = 'hr';

	/**
	 * @param {number} n 字符串长度
	 * @param {import('../../typings/token').accum} accum
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
