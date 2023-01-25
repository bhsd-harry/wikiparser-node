'use strict';

const Parser = require('..'),
	Token = require('.'),
	HasNowikiToken = require('./hasNowiki');

/**
 * `<charinsert>`
 * @classdesc `{childNodes: [...HasNowikiToken]}`
 */
class CharinsertToken extends Token {
	type = 'ext-inner';
	name = 'charinsert';

	/**
	 * @param {string} wikitext wikitext
	 * @param {accum} accum
	 */
	constructor(wikitext, config = Parser.getConfig(), accum = []) {
		super(undefined, config, true, accum, {
		});
		const SingleLineHasNowikiToken = HasNowikiToken;
		this.append(
			...wikitext.split('\n').map(str => new SingleLineHasNowikiToken(str, 'charinsert-line', config, accum)),
		);
	}

	/**
	 * @override
	 */
	toString(selector) {
		return super.toString(selector, '\n');
	}

	/** @override */
	getGaps() {
		return 1;
	}
}

module.exports = CharinsertToken;
