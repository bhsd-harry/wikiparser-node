'use strict';
const Parser = require('../index');
const Token = require('.');

/** 不会被继续解析的plain Token */
class AtomToken extends Token {
	/** @browser */
	constructor(wikitext, type, config = Parser.getConfig(), accum = [], acceptable) {
		super(wikitext, config, true, accum, acceptable);
		this.type = type;
	}

	/** @override */
	cloneNode() {
		const cloned = this.cloneChildNodes(),
			config = this.getAttribute('config'),
			acceptable = this.getAttribute('acceptable');
		return Parser.run(() => {
			const token = new AtomToken(undefined, this.type, config, [], acceptable);
			token.append(...cloned);
			return token;
		});
	}
}
Parser.classes.AtomToken = __filename;
module.exports = AtomToken;
