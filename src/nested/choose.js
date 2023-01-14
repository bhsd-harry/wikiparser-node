'use strict';

const Parser = require('../..'),
	NestedToken = require('.');

/**
 * `<choose>`
 * @classdesc `{childNodes: [...ExtToken|NoincludeToken]}`
 */
class ChooseToken extends NestedToken {
	name = 'choose';

	/**
	 * @param {string|undefined} wikitext wikitext
	 * @param {accum} accum
	 */
	constructor(wikitext, config = Parser.getConfig(), accum = []) {
		const regex = /<(option|choicetemplate)(\s[^>]*)?>(.*?)<\/(\1)>/gsu;
		super(wikitext, regex, config, accum);
	}
}

module.exports = ChooseToken;
