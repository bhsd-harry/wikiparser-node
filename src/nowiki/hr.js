'use strict';

const /** @type {Parser} */ Parser = require('../..'),
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
	constructor(n, config = Parser.getConfig(), accum = []) {
		super('-'.repeat(n), config, accum);
	}
}

module.exports = HrToken;
