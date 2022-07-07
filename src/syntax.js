'use strict';

const /** @type {Parser} */ Parser = require('..'),
	Token = require('.');

/**
 * 满足特定语法格式的plain Token
 * @classdesc `{childNodes: (string|Token)[]}`
 */
class SyntaxToken extends Token {
	/**
	 * @param {?string} wikitext
	 * @param {RegExp} pattern
	 * @param {accum} accum
	 * @param {acceptable} acceptable
	 */
	constructor(wikitext, pattern, type = 'plain', config = Parser.getConfig(), accum = [], acceptable = null) {
		super(wikitext, config, true, accum, acceptable);
		this.type = type;
	}
}

module.exports = SyntaxToken;
