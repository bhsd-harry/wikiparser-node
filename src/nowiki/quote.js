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
	 * @param {number} n
	 * @param {accum} accum
	 */
	constructor(n, config = Parser.getConfig(), accum = []) {
		super("'".repeat(n), config, accum);
		this.setAttribute('name', String(n));
	}

	/** @param {string} str */
	setText(str) {
		if (!["''", "'''", "'''''"].includes(str)) {
			throw new RangeError(`${this.constructor.name} 的内部文本只能为连续 2/3/5 个"'"！`);
		}
		return super.setText(str);
	}
}

Parser.classes.QuoteToken = __filename;
module.exports = QuoteToken;
