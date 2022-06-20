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

	/** @this {IncludeToken & {firstChild: string, lastChild: string}} */
	cloneNode() {
		Parser.running = true;
		const tags = this.getAttribute('tags'),
			inner = this.selfClosing ? undefined : this.lastChild,
			closing = this.selfClosing || !this.closed ? undefined : tags[1];
		const token = new IncludeToken(tags[0], this.firstChild, inner, closing);
		Parser.running = false;
		return token;
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
