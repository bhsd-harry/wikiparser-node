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
	 * @param {number} n
	 * @param {accum} accum
	 */
	constructor(n, config = Parser.getConfig(), accum = []) {
		super('-'.repeat(n), config, accum);
	}

	/**
	 * @override
	 * @this {HrToken & {firstChild: string}}
	 */
	cloneNode() {
		return Parser.run(() => new HrToken(this.firstChild.length, this.getAttribute('config')));
	}

	/**
	 * @override
	 * @param {string} str 新文本
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
