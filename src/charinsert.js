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
		super(undefined, config, true, accum);
		this.append(...wikitext.split('\n').map(str => new HasNowikiToken(str, 'charinsert-line', config, accum)));
	}

	/** @override */
	toString() {
		return super.toString('\n');
	}

	/** @override */
	getGaps() {
		return 1;
	}

	/** @override */
	print() {
		return super.print({sep: '\n'});
	}
}

module.exports = CharinsertToken;
