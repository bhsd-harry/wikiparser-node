'use strict';

const Parser = require('../..'),
	Token = require('..');

/**
 * `<pre>`
 * @classdesc `{childNodes: [...AstText|NoincludeToken]}`
 */
class HasNowikiToken extends Token {
	/**
	 * @param {string} wikitext wikitext
	 * @param {string} type type
	 * @param {accum} accum
	 */
	constructor(wikitext, type, config = Parser.getConfig(), accum = []) {
		const NoincludeToken = require('../nowiki/noinclude');
		wikitext = wikitext.replaceAll(
			/(<nowiki>)(.*?)(<\/nowiki>)/giu,
			/** @type {function(...string): string} */ (_, opening, inner, closing) => {
				new NoincludeToken(opening, config, accum);
				new NoincludeToken(closing, config, accum);
				return `\0${accum.length - 1}c\x7F${inner}\0${accum.length}c\x7F`;
			},
		);
		super(wikitext, config, true, accum);
		this.type = type;
	}
}

module.exports = HasNowikiToken;
