'use strict';

const /** @type {Parser} */ Parser = require('..'),
	Token = require('.');

/**
 * 嵌入时的`<onlyinclude>`
 * @classdesc `{childNodes: ...string|Token}`
 */
class OnlyincludeToken extends Token {
	type = 'onlyinclude';

	/**
	 * @param {string} inner
	 * @param {accum} accum
	 */
	constructor(inner, config = Parser.getConfig(), accum = []) {
		super(inner, config, false, accum);
	}

	toString() {
		return `<onlyinclude>${super.toString()}</onlyinclude>`;
	}

	print() {
		return super.print({pre: '&lt;onlyinclude&gt;', post: '&lt;/onlyinclude&gt;'});
	}

	isPlain() {
		return this.constructor === OnlyincludeToken;
	}
}

module.exports = OnlyincludeToken;
