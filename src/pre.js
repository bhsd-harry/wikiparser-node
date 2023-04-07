'use strict';
const Parser = require('../index');
const Token = require('.');
const NoincludeToken = require('./nowiki/noinclude');

/**
 * `<pre>`
 * @classdesc `{childNodes: [...AstText|NoincludeToken|ConverterToken]}`
 */
class PreToken extends Token {
	/** @browser */
	type = 'ext-inner';
	/** @browser */
	name = 'pre';
	/** @browser */
	constructor(wikitext, config = Parser.getConfig(), accum = []) {
		wikitext = wikitext?.replace(// eslint-disable-line no-param-reassign
			/(<nowiki>)(.*?)(<\/nowiki>)/giu, (_, opening, inner, closing) => {
				// @ts-expect-error abstract class
				new NoincludeToken(opening, config, accum);
				// @ts-expect-error abstract class
				new NoincludeToken(closing, config, accum);
				return `\0${accum.length - 1}c\x7F${inner}\0${accum.length}c\x7F`;
			},
		);
		super(wikitext, config, true, accum, {
			AstText: ':', NoincludeToken: ':', ConverterToken: ':',
		});
		this.setAttribute('stage', Parser.MAX_STAGE - 1);
	}

	/** @private */
	isPlain() {
		return true;
	}

	/** @override */
	cloneNode() {
		const cloned = this.cloneChildNodes();
		return Parser.run(() => {
			// @ts-expect-error abstract class
			const token = new PreToken(undefined, this.getAttribute('config'));
			token.append(...cloned);
			return token;
		});
	}
}
Parser.classes.PreToken = __filename;
module.exports = PreToken;
