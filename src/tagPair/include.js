'use strict';

const /** @type {Parser} */ Parser = require('../..'),
	TagPairToken = require('.');

/**
 * `<includeonly>`或`<noinclude>`
 * @classdesc `{childNodes: [string, string]}`
 */
class IncludeToken extends TagPairToken {
	type = 'include';

	/**
	 * @param {string} name
	 * @param {string|undefined} inner
	 * @param {string|undefined} closing
	 * @param {accum} accum
	 */
	constructor(name, attr = '', inner = undefined, closing = undefined, config = Parser.getConfig(), accum = []) {
		super(name, attr, inner ?? '', inner !== undefined ? closing ?? '' : closing, config, accum);
	}
}

module.exports = IncludeToken;
