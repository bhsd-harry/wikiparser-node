'use strict';

const parseBrackets = require('../parser/brackets'),
	Parser = require('..'),
	Token = require('.');

/**
 * `<inputbox>`
 * @classdesc `{childNodes: ...AstText|ArgToken|TranscludeToken}`
 */
class InputboxToken extends Token {
	type = 'ext-inner';
	name = 'inputbox';

	/**
	 * @param {string} wikitext wikitext
	 * @param {accum} accum
	 */
	constructor(wikitext, config = Parser.getConfig(), accum = []) {
		wikitext = parseBrackets(wikitext, config, accum).replaceAll(/(?<=\0)\d+(?=\D\x7F)/gu, n => Number(n) + 1);
		super(wikitext, config, true, accum, {AstText: ':', ArgToken: ':', TranscludeToken: ':'});
	}

	/** @override */
	afterBuild() {
		for (const heading of this.querySelectorAll('heading')) {
			heading.replaceWith(String(heading));
		}
	}

	/** @override */
	cloneNode() {
		const cloned = this.cloneChildNodes(),
			token = Parser.run(() => new InputboxToken(undefined, this.getAttribute('config')));
		token.append(...cloned);
		return token;
	}
}

Parser.classes.InputboxToken = __filename;
module.exports = InputboxToken;
