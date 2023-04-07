'use strict';
const fixed = require('../../mixin/fixed');
const Parser = require('../../index');
const Token = require('..');

/**
 * 纯文字Token，不会被解析
 * @classdesc `{childNodes: [AstText]}`
 */
class NowikiBaseToken extends fixed(Token) {
	/** @browser */
	constructor(wikitext, config = Parser.getConfig(), accum = []) {
		super(wikitext, config, true, accum);
	}

	/** @override */
	cloneNode() {
		const {constructor, firstChild: {data}, type} = this,
			token = Parser.run(() => new constructor(data, this.getAttribute('config')));
		token.type = type;
		return token;
	}

	/**
	 * @override
	 * @param str 新文本
	 */
	setText(str) {
		return super.setText(str, 0);
	}
}
Parser.classes.NowikiBaseToken = __filename;
module.exports = NowikiBaseToken;
