'use strict';

const /** @type {Parser} */ Parser = require('../..'),
	Token = require('..');

/**
 * 不会被继续解析的plain Token
 * @classdesc `{childNodes: (string|Token)[]}`
 */
class AtomToken extends Token {
	/**
	 * @param {?string} wikitext
	 * @param {accum} accum
	 * @param {acceptable} acceptable
	 */
	constructor(wikitext, type = 'plain', config = Parser.getConfig(), accum = [], acceptable = null) {
		super(wikitext, config, true, accum, acceptable);
		this.type = type;
	}
}

module.exports = AtomToken;
