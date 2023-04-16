'use strict';

const Parser = require('../..'),
	NestedToken = require('.');

/**
 * `<references>`
 * @classdesc `{childNodes: [...ExtToken|NoincludeToken|CommentToken]}`
 */
class ReferencesToken extends NestedToken {
	name = 'references';

	/**
	 * @param {string} wikitext wikitext
	 * @param {import('..')[]} accum
	 */
	constructor(wikitext, config = Parser.getConfig(), accum = []) {
		super(wikitext, /<!--.*?(?:-->|$)|<(ref)(\s[^>]*)?>(.*?)<\/(ref\s*)>/gisu, ['ref'], config, accum);
	}
}

module.exports = ReferencesToken;
