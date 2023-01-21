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
	 * @param {acceptable} acceptable 可接受的子节点设置
	 */
	constructor(wikitext, type, config = Parser.getConfig(), accum = [], acceptable = undefined) {
		super(wikitext, config, true, accum, acceptable);
		if (type) {
			this.type = type;
		}
	}

	/**
	 * @override
	 * @this {AtomToken & {constructor: typeof AtomToken}}
	 */
	cloneNode() {
		const cloned = this.cloneChildNodes(),
			config = this.getAttribute('config'),
			acceptable = this.getAttribute('acceptable');
		return Parser.run(() => {
			const token = new this.constructor(undefined, this.type, config, [], acceptable);
			token.append(...cloned);
			return token;
		});
	}
}

Parser.classes.AtomToken = __filename;
module.exports = AtomToken;
