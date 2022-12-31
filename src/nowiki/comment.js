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
	constructor(wikitext, closed = true, config = Parser.getConfig(), accum = []) {
		super(wikitext, config, accum);
		this.closed = closed;
	}

	/**
	 * @override
	 * @this {CommentToken & {firstChild: string}}
	 */
	cloneNode() {
		return Parser.run(() => new CommentToken(this.firstChild, this.closed, this.getAttribute('config')));
	}

	/**
	 * @override
	 * @this {CommentToken & {firstChild: string}}
	 */
	toString() {
		const {firstChild, closed, nextSibling} = this;
		if (!closed && nextSibling) {
			Parser.error('自动闭合HTML注释', this);
			this.closed = true;
		}
		return `<!--${firstChild}${this.closed ? '-->' : ''}`; // eslint-disable-line unicorn/consistent-destructuring
	}

	getPadding() {
		return 4;
	}
}

Parser.classes.CommentToken = __filename;
module.exports = CommentToken;
