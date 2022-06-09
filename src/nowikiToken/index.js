'use strict';

const fixedToken = require('../../mixin/fixedToken'),
	/** @type {Parser} */ Parser = require('../..'),
	Token = require('../token');

/**
 * 纯文字Token，不会被解析
 * @classdesc `{childNodes: [string]}`
 */
class NowikiToken extends fixedToken(Token) {
	type = 'ext-inner';

	/**
	 * @param {string} wikitext
	 * @param {accum} accum
	 */
	constructor(wikitext, accum = []) {
		super(wikitext, null, false, accum, {String: ':'});
	}
}

Parser.classes.NowikiToken = __filename;
module.exports = NowikiToken;
