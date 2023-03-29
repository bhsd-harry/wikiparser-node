'use strict';

const Parser = require('../..'),
	NestedToken = require('.');

/**
 * `<combobox>`
 * @classdesc `{childNodes: [...ExtToken|NoincludeToken]}`
 */
class ComboboxToken extends NestedToken {
	name = 'combobox';

	/**
	 * @param {string|undefined} wikitext wikitext
	 * @param {import('../../typings/token').accum} accum
	 */
	constructor(wikitext, config = Parser.getConfig(), accum = []) {
		super(wikitext, /<(combooption)(\s[^>]*)?>(.*?)<\/(combooption\s*)>/gisu, ['combooption'], config, accum);
	}
}

module.exports = ComboboxToken;
