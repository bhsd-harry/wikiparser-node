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
	 * @param {string} wikitext wikitext
	 * @param {accum} accum
	 */
	constructor(wikitext, config = Parser.getConfig(), accum = []) {
		super(wikitext, config, true, accum);
	}

	/**
	 * @override
	 * @this {NowikiToken & {firstChild: string, constructor: typeof NowikiToken}}
	 */
	cloneNode() {
		const {constructor, firstChild, type} = this,
			token = Parser.run(() => new constructor(firstChild, this.getAttribute('config')));
		token.type = type;
		return token;
	}

	/**
	 * @override
	 * @param {string} str 新文本
	 */
	setText(str) {
		return super.setText(str, 0);
	}
}

Parser.classes.NowikiToken = __filename;
module.exports = NowikiToken;
