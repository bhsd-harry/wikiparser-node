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
	 * @param {accum} accum
	 */
	constructor(wikitext, config = Parser.getConfig(), accum = []) {
		super(wikitext, /<(combooption)(\s[^>]*)?>(.*?)<\/(combooption\s*)>/gisu, ['combooption'], config, accum);
	}
}

Parser.classes.ComboboxToken = __filename;
module.exports = ComboboxToken;
