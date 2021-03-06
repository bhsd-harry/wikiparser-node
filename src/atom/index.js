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

	cloneNode() {
		const cloned = this.cloneChildren(),
			/** @type {typeof AtomToken} */ Constructor = this.constructor,
			config = this.getAttribute('config'),
			acceptable = this.getAttribute('acceptable'),
			token = Parser.run(() => new Constructor(undefined, this.type, config, [], acceptable));
		token.append(...cloned);
		return token;
	}
}

Parser.classes.AtomToken = __filename;
module.exports = AtomToken;
