'use strict';
const sol = require('../../mixin/sol');
const Parser = require('../../index');
const NowikiBaseToken = require('./base');

/** `<hr>` */
class HrToken extends sol(NowikiBaseToken) {
	/** @browser */
	type = 'hr';

	/**
	 * @browser
	 * @param n 字符串长度
	 */
	constructor(n, config = Parser.getConfig(), accum = []) {
		super('-'.repeat(n), config, accum);
	}

	/** @override */
	cloneNode() {
		return Parser.run(() => new HrToken(this.firstChild.data.length, this.getAttribute('config')));
	}

	/**
	 * @override
	 * @param str 新文本
	 * @throws `RangeError` 错误的`<hr>`语法
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
