'use strict';

const fixedToken = require('../../mixin/fixedToken'),
	/** @type {Parser} */ Parser = require('../..'),
	Token = require('..');

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
		super(wikitext, null, false, accum);
	}

	cloneNode() {
		Parser.running = true;
		const token = new NowikiToken();
		token.type = this.type;
		Parser.running = false;
		return token;
	}

	/** @param {string} str */
	setText(str) {
		return super.setText(str, 0);
	}
}

Parser.classes.NowikiToken = __filename;
module.exports = NowikiToken;
