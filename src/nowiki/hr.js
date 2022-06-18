'use strict';

const {typeError} = require('../../util/debug'),
	/** @type {Parser} */ Parser = require('../..'),
	NowikiToken = require('.');

/**
 * `<hr>`
 * @classdesc `{childNodes: [string]}`
 */
class HrToken extends NowikiToken {
	type = 'hr';

	/**
	 * @param {number} n
	 * @param {accum} accum
	 */
	constructor(n, accum = []) {
		if (typeof n !== 'number') {
			typeError('Number');
		} else if (n < 4 || !Number.isInteger(n)) {
			throw new RangeError('输入参数应为不小于4的正整数！');
		}
		super('-'.repeat(n), accum);
	}

	/** @param {string} str */
	setText(str) {
		if (!/^-{4,}$/.test(str)) {
			throw new RangeError('<hr>总是写作不少于4个的连续"-"！');
		}
		return super.setText(str);
	}

	/** @returns {[number, string][]} */
	plain() {
		return [];
	}
}

Parser.classes.HrToken = __filename;
module.exports = HrToken;
