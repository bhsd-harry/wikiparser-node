'use strict';
const Token = require('./token'),
	{typeError, numberToString} = require('./util');

/** @content string */
class AtomToken extends Token {
	/**
	 * @param {string|number|Token|(string|Token)[]} wikitext
	 * @param {string} type
	 * @param {Token} parent
	 * @param {Token[]} accum
	 */
	constructor(wikitext, type, parent = null, accum = [], acceptable = ['String']) {
		wikitext = (Array.isArray(wikitext) ? wikitext : [wikitext]).map(numberToString);
		if (wikitext.some(ele => !acceptable.includes(ele.constructor.name))) {
			typeError(...acceptable);
		}
		super(wikitext, null, true, parent, accum, acceptable);
		this.type = type;
	}

	empty() {
		return this.content('');
	}
}

Token.classes.AtomToken = AtomToken;

module.exports = AtomToken;
