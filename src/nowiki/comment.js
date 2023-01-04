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
	 * 内部wikitext
	 * @this {{firstChild: string}}
	 */
	get innerText() {
		return this.firstChild;
	}

	/**
	 * @param {string} wikitext wikitext
	 * @param {boolean} closed 是否闭合
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
	 * @param {string} selector
	 */
	toString(selector) {
		const {firstChild, closed, nextSibling} = this;
		if (!closed && nextSibling) {
			Parser.error('自动闭合HTML注释', this);
			this.closed = true;
		}
		return selector && this.matches(selector)
			? ''
			: `<!--${firstChild}${this.closed ? '-->' : ''}`; // eslint-disable-line unicorn/consistent-destructuring
	}

	/** @override */
	getPadding() {
		return 4;
	}
}

Parser.classes.CommentToken = __filename;
module.exports = CommentToken;
