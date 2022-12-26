'use strict';

const /** @type {Parser} */ Parser = require('../..'),
	NowikiToken = require('.');

/**
 * HTML注释，不可见
 * @classdesc `{childNodes: [string]}`
 */
class CommentToken extends NowikiToken {
	type = 'comment';
	closed;

	/**
	 * @param {string} wikitext
	 * @param {accum} accum
	 */
	constructor(wikitext, closed = true, config = Parser.getConfig(), accum = []) {
		super(wikitext, config, accum);
		this.closed = closed;
	}

	/** @this {CommentToken & {firstChild: string}} */
	toString() {
		return `<!--${this.firstChild}${this.closed ? '-->' : ''}`;
	}

	print() {
		return super.print({pre: '&lt;!--', post: this.closed ? '--&gt;' : ''});
	}
}

module.exports = CommentToken;
