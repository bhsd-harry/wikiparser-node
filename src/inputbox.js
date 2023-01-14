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
		wikitext = parseBrackets(wikitext, config, accum).replaceAll(
			/\0(\d+)(\D)\x7F/gu,
			/** @type {function(...string): string} */ (_, num, mark) => `\0${Number(num) + 1}${mark}\x7F`,
		);
		super(wikitext, config, true, accum);
	}

	/** @override */
	afterBuild() {
		for (const heading of this.querySelectorAll('heading')) {
			heading.replaceWith(String(heading));
		}
	}
}

module.exports = InputboxToken;
