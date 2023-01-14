'use strict';

const Parser = require('../..'),
	NestedToken = require('.');

/**
 * `<references>`
 * @classdesc `{childNodes: [...ExtToken|NoincludeToken]}`
 */
class ReferencesToken extends NestedToken {
	name = 'references';

	/**
	 * @param {string|undefined} wikitext wikitext
	 * @param {accum} accum
	 */
	constructor(wikitext, config = Parser.getConfig(), accum = []) {
		super(wikitext, /<(ref)(\s[^>]*)?>(.*?)<\/(ref\s*)>/gisu, config, accum);
	}
}

module.exports = ReferencesToken;
