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
	 * @param {accum} accum
	 */
	constructor(wikitext, config = Parser.getConfig(), accum = []) {
		super(wikitext, 'ext-inner', config, accum);
		this.setAttribute('stage', Parser.MAX_STAGE - 1);
	}

	/** @override */
	isPlain() {
		return true;
	}
}

module.exports = PreToken;
