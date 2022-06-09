'use strict';

const fixedToken = require('../../mixin/fixedToken'),
	{typeError} = require('../../util/debug'),
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

	/** @param {string} str */
	setText(str) {
		if (typeof str !== 'string') {
			typeError('String');
		}
		this.setAttribute('childNodes', [str]);
	}
}

Parser.classes.NowikiToken = __filename;
module.exports = NowikiToken;
