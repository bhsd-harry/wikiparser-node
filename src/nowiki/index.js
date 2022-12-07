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
	constructor(wikitext, config = Parser.getConfig(), accum = []) {
		super(wikitext, config, true, accum);
	}

	/** @this {NowikiToken & {firstChild: string}} */
	cloneNode() {
		const /** @type {typeof NowikiToken} */ Constructor = this.constructor,
			token = Parser.run(() => new Constructor(this.firstChild, this.getAttribute('config')));
		token.type = this.type;
		return token;
	}

	/** @param {string} str */
	setText(str) {
		return super.setText(str, 0);
	}
}

Parser.classes.NowikiToken = __filename;
module.exports = NowikiToken;
