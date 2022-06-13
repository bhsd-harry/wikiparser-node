'use strict';

const /** @type {Parser} */ Parser = require('..'),
	Token = require('./token');

/** 嵌入时的`<onlyinclude>` */
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

	getPadding() {
		return 13;
	}

	isPlain() {
		return this.constructor === OnlyincludeToken;
	}
}

Parser.classes.OnlyincludeToken = __filename;
module.exports = OnlyincludeToken;
