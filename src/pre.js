'use strict';

const Parser = require('..'),
	Token = require('.');

/**
 * `<pre>`
 * @classdesc `{childNodes: [...AstText|ConverterToken]}`
 */
class PreToken extends Token {
	type = 'ext-inner';
	name = 'pre';

	/**
	 * @param {string} wikitext wikitext
	 * @param {accum} accum
	 */
	constructor(wikitext, config = Parser.getConfig(), accum = []) {
		super(wikitext, config, true, accum);
		this.setAttribute('stage', Parser.MAX_STAGE - 1);
	}

	/** @override */
	isPlain() {
		return true;
	}
}

Parser.classes.PreToken = __filename;
module.exports = PreToken;
