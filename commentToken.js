'use strict';
const Token = require('./token'),
	NowikiToken = require('./nowikiToken');

/** @content string */
class CommentToken extends NowikiToken {
	closed;

	/**
	 * @param {string|number|Token|TokenCollection} wikitext
	 * @param {Token[]} accum
	 */
	constructor(wikitext, closed = true, accum = []) {
		super(wikitext, null, accum);
		this.type = 'comment';
		this.closed = closed;
		this.freeze('type');
	}

	toString() {
		return `<!--${this.$children[0]}${this.closed ? '-->' : ''}`;
	}

	close() {
		this.closed = true;
		return this;
	}
}

Token.classes.CommentToken = CommentToken;

module.exports = CommentToken;
