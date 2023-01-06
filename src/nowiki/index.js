'use strict';

const fixedToken = require('../../mixin/fixedToken'),
	Parser = require('../..'),
	Token = require('..'),
	Text = require('../../lib/text');

/**
 * 纯文字Token，不会被解析
 * @classdesc `{childNodes: [Text]}`
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
	 * @this {NowikiToken & {firstChild: Text, constructor: typeof NowikiToken}}
	 */
	cloneNode() {
		const {constructor, firstChild: {data}, type} = this,
			token = Parser.run(() => new constructor(data, this.getAttribute('config')));
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
