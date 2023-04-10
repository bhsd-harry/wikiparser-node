'use strict';

const Parser = require('../..'),
	Token = require('..'),
	NoincludeToken = require('../nowiki/noinclude');

/**
 * `<pre>`
 * @classdesc `{childNodes: [...AstText|NoincludeToken]}`
 */
class HasNowikiToken extends Token {
	/**
	 * @param {string} wikitext wikitext
	 * @param {'ext-inner'} type type
	 * @param {Token[]} accum
	 */
	constructor(wikitext, type, config = Parser.getConfig(), accum = []) {
		wikitext = wikitext.replace(
			/(<nowiki>)(.*?)(<\/nowiki>)/giu,
			/** @type {function(...string): string} */ (_, opening, inner, closing) => {
				new NoincludeToken(opening, config, accum);
				new NoincludeToken(closing, config, accum);
				return `\0${accum.length - 1}c\x7F${inner}\0${accum.length}c\x7F`;
			},
		);
		super(wikitext, config, true, accum, {
			AstText: ':', NoincludeToken: ':',
		});
		this.type = type;
	}

	/** @override */
	cloneNode() {
		const cloned = this.cloneChildNodes();
		return Parser.run(() => {
			const token = /** @type {this} */ (new HasNowikiToken(undefined, this.type, this.getAttribute('config')));
			token.append(...cloned);
			return token;
		});
	}
}

Parser.classes.HasNowikiToken = __filename;
module.exports = HasNowikiToken;
