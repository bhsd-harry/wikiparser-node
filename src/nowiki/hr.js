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

	/** @this {HrToken & {firstChild: string}} */
	cloneNode() {
		return Parser.run(() => new HrToken(this.firstChild.length, this.getAttribute('config')));
	}

	/** @param {string} str */
	setText(str) {
		if (!/^-{4,}$/.test(str)) {
			throw new RangeError('<hr>总是写作不少于4个的连续"-"！');
		}
		return super.setText(str);
	}
}

Parser.classes.HrToken = __filename;
module.exports = HrToken;
