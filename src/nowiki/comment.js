'use strict';

const Parser = require('../..'),
	NowikiToken = require('.');

/**
 * HTML注释，不可见
 * @classdesc `{childNodes: [AstText]}`
 */
class CommentToken extends NowikiToken {
	type = 'comment';
	closed;

	/**
	 * @param {string} wikitext wikitext
	 * @param {boolean} closed 是否闭合
	 * @param {accum} accum
	 */
	constructor(wikitext, closed = true, config = Parser.getConfig(), accum = []) {
		super(wikitext, config, accum);
		this.closed = closed;
	}

	/** @override */
	toString() {
		return `<!--${String(this.firstChild)}${this.closed ? '-->' : ''}`;
	}

	/** @override */
	getPadding() {
		return 4;
	}

	/** @override */
	print() {
		return super.print({pre: '&lt;!--', post: this.closed ? '--&gt;' : ''});
	}
}

module.exports = CommentToken;
