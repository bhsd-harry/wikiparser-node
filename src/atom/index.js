'use strict';

const Parser = require('../..'),
	Token = require('..');

/**
 * 不会被继续解析的plain Token
 * @classdesc `{childNodes: ...AstText|Token}`
 */
class AtomToken extends Token {
	type = 'plain';

	/**
	 * @param {string} wikitext wikitext
	 * @param {string|undefined} type Token.type
	 * @param {accum} accum
	 */
	constructor(wikitext, type, config = Parser.getConfig(), accum = []) {
		super(wikitext, config, true, accum);
		if (type) {
			this.type = type;
		}
	}
}

module.exports = AtomToken;
