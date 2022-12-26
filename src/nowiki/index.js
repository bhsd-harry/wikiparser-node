'use strict';

const /** @type {Parser} */ Parser = require('../..'),
	Token = require('..');

/**
 * 纯文字Token，不会被解析
 * @classdesc `{childNodes: [string]}`
 */
class NowikiToken extends Token {
	type = 'ext-inner';

	/**
	 * @param {string} wikitext
	 * @param {accum} accum
	 */
	constructor(wikitext, config = Parser.getConfig(), accum = []) {
		super(wikitext, config, true, accum);
	}
}

module.exports = NowikiToken;
