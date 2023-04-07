'use strict';
const hidden = require('../mixin/hidden');
const Parser = require('../index');
const Token = require('.');

/** 不可见的节点 */
class HiddenToken extends hidden(Token) {
	/** @browser */
	type = 'hidden';
	/** @browser */
	constructor(wikitext, config = Parser.getConfig(), accum = [], acceptable) {
		super(wikitext, config, true, accum, acceptable);
	}

	/** @override */
	cloneNode() {
		const cloned = this.cloneChildNodes(),
			config = this.getAttribute('config'),
			acceptable = this.getAttribute('acceptable');
		return Parser.run(() => {
			const token = new HiddenToken(undefined, config, [], acceptable);
			token.append(...cloned);
			return token;
		});
	}
}
Parser.classes.HiddenToken = __filename;
module.exports = HiddenToken;
