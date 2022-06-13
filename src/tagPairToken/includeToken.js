'use strict';

const hidden = require('../../mixin/hidden'),
	/** @type {Parser} */ Parser = require('../..'),
	TagPairToken = require('.');

/**
 * `<includeonly>`或`<noinclude>`
 * @classdesc `{childNodes: [string, string]}`
 */
class IncludeToken extends hidden(TagPairToken) {
	type = 'include';

	/**
	 * @param {string} name
	 * @param {string|undefined} inner
	 * @param {string|undefined} closing
	 * @param {accum} accum
	 */
	constructor(name, attr = '', inner = undefined, closing = undefined, accum = []) {
		super(name, attr, inner ?? '', inner !== undefined ? closing ?? '' : closing, null, accum, {String: [0, 1]});
	}

	/** @param {string} str */
	setText(str) {
		return super.setText(str, 1);
	}

	removeAttr() {
		super.setText('', 0);
	}
}

Parser.classes.IncludeToken = __filename;
module.exports = IncludeToken;
