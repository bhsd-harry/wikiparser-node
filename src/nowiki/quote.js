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

	setText() {
		throw new Error(`禁止修改 ${this.constructor.name}！`);
	}

	/** @returns {[number, string][]} */
	plain() {
		return [];
	}
}

Parser.classes.QuoteToken = __filename;
module.exports = QuoteToken;
