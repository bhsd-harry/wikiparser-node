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
	 * @param {string} wikitext wikitext
	 * @param {import('..')[]} accum
	 */
	constructor(wikitext, config = Parser.getConfig(), accum = []) {
		super(wikitext, /<(combooption)(\s[^>]*)?>(.*?)<\/(combooption\s*)>/gisu, ['combooption'], config, accum);
	}
}

module.exports = ComboboxToken;
