'use strict';

const Parser = require('..'),
	Token = require('.');

/**
 * 满足特定语法格式的plain Token
 * @classdesc `{childNodes: ...AstText|Token}`
 */
class SyntaxToken extends Token {
	/**
	 * @param {string} wikitext 语法wikitext
	 * @param {RegExp} pattern 语法正则
	 * @param {string} type Token.type
	 * @param {accum} accum
	 */
	constructor(wikitext, type = 'plain', config = Parser.getConfig(), accum = []) {
		super(wikitext, config, true, accum);
		this.type = type;
	}
}

module.exports = SyntaxToken;
