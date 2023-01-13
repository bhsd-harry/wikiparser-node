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
		super(wikitext, config, true, accum, {AstText: ':', ConverterToken: ':'});
		this.setAttribute('stage', Parser.MAX_STAGE - 1);
	}

	/** @override */
	isPlain() {
		return true;
	}

	/** @override */
	cloneNode() {
		const cloned = this.cloneChildNodes(),
			token = Parser.run(() => new PreToken(undefined, this.getAttribute('config')));
		token.append(...cloned);
		return token;
	}

	/** @override */
	text() {
		return super.text().replaceAll(/<nowiki>(.*?)<\/nowiki>/gu, '$1');
	}
}

Parser.classes.PreToken = __filename;
module.exports = PreToken;
