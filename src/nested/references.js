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
	 * @param {string|undefined} wikitext wikitext
	 * @param {import('../../typings/token').accum} accum
	 */
	constructor(wikitext, config = Parser.getConfig(), accum = []) {
		super(wikitext, /<!--.*?(?:-->|$)|<(ref)(\s[^>]*)?>(.*?)<\/(ref\s*)>/gisu, ['ref'], config, accum);
	}
}

Parser.classes.ReferencesToken = __filename;
module.exports = ReferencesToken;
