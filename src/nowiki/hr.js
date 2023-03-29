'use strict';

const Parser = require('../..'),
	NowikiToken = require('.');

/**
 * `<hr>`
 * @classdesc `{childNodes: [AstText]}`
 */
class HrToken extends NowikiToken {
	type = 'hr';

	/**
	 * @param {number} n 字符串长度
	 * @param {import('../../typings/token').accum} accum
	 */
	constructor(n, config = Parser.getConfig(), accum = []) {
		super('-'.repeat(n), config, accum);
	}
}

module.exports = HrToken;
