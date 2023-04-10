'use strict';

const Parser = require('../..'),
	HasNowikiToken = require('.');

/**
 * `<pre>`
 * @classdesc `{childNodes: [...AstText|NoincludeToken|ConverterToken]}`
 */
class PreToken extends HasNowikiToken {
	name = 'pre';

	/**
	 * @param {string} wikitext wikitext
	 * @param {import('..')[]} accum
	 */
	constructor(wikitext, config = Parser.getConfig(), accum = []) {
		super(wikitext, 'ext-inner', config, accum);
		this.setAttribute('stage', Parser.MAX_STAGE - 1);
		this.setAttribute('acceptable', {AstText: ':', NoincludeToken: ':', ConverterToken: ':'});
	}

	/** @override */
	isPlain() {
		return true;
	}

	/** @override */
	cloneNode() {
		const cloned = this.cloneChildNodes();
		return Parser.run(() => {
			const token = /** @type {this} */ (new PreToken(undefined, this.getAttribute('config')));
			token.append(...cloned);
			return token;
		});
	}
}

Parser.classes.PreToken = __filename;
module.exports = PreToken;
