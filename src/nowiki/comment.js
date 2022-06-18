'use strict';

const hidden = require('../../mixin/hidden'),
	/** @type {Parser} */ Parser = require('../..'),
	NowikiToken = require('.');

/**
 * HTML注释，不可见
 * @classdesc `{childNodes: [string]}`
 */
class CommentToken extends hidden(NowikiToken) {
	type = 'comment';
	closed;

	/**
	 * @param {string} wikitext
	 * @param {accum} accum
	 */
	constructor(wikitext, closed = true, accum = []) {
		super(wikitext, accum);
		this.closed = closed;
	}

	cloneNode() {
		Parser.running = true;
		const token = new CommentToken(undefined, this.closed);
		Parser.running = false;
		return token;
	}

	/** @this {CommentToken & {firstChild: string}} */
	toString() {
		const {firstChild, closed, nextSibling} = this;
		if (!closed && nextSibling) {
			Parser.error('自动闭合HTML注释', firstChild.replaceAll('\n', '\\n'));
			this.closed = true;
		}
		return `<!--${firstChild}${this.closed ? '-->' : ''}`;
	}

	getPadding() {
		return 4;
	}
}

Parser.classes.CommentToken = __filename;
module.exports = CommentToken;
