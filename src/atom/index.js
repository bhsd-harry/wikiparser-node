'use strict';

const Parser = require('../..'),
	Token = require('..');

/**
 * 不会被继续解析的plain Token
 * @classdesc `{childNodes: (string|Token)[]}`
 */
class AtomToken extends Token {
	/**
	 * @param {?string} wikitext wikitext
	 * @param {string} type Token.type
	 * @param {accum} accum
	 * @param {acceptable} acceptable 可接受的子节点设置
	 */
	constructor(wikitext, type = 'plain', config = Parser.getConfig(), accum = [], acceptable = null) {
		super(wikitext, config, true, accum, acceptable);
		this.type = type;
	}

	/** @override */
	cloneNode() {
		const cloned = this.cloneChildren(),
			/** @type {{constructor: typeof AtomToken}} */ {constructor} = this,
			config = this.getAttribute('config'),
			acceptable = this.getAttribute('acceptable'),
			token = Parser.run(() => new constructor(undefined, this.type, config, [], acceptable));
		token.append(...cloned);
		return token;
	}
}

Parser.classes.AtomToken = __filename;
module.exports = AtomToken;
