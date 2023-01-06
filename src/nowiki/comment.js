'use strict';

const hidden = require('../../mixin/hidden'),
	Parser = require('../..'),
	Text = require('../../lib/text'),
	NowikiToken = require('.');

/**
 * HTML注释，不可见
 * @classdesc `{childNodes: [Text]}`
 */
class CommentToken extends hidden(NowikiToken) {
	type = 'comment';
	closed;

	/**
	 * 内部wikitext
	 * @this {{firstChild: Text}}
	 */
	get innerText() {
		return this.firstChild.data;
	}

	/**
	 * @param {string} wikitext wikitext
	 * @param {boolean} closed 是否闭合
	 * @param {accum} accum
	 */
	constructor(wikitext, closed = true, config = Parser.getConfig(), accum = []) {
		super(wikitext, config, accum);
		this.closed = closed;
		Object.defineProperty(this, 'closed', {enumerable: false});
	}

	/**
	 * @override
	 * @this {CommentToken & {firstChild: Text}}
	 */
	cloneNode() {
		return Parser.run(() => new CommentToken(this.firstChild.data, this.closed, this.getAttribute('config')));
	}

	/**
	 * @override
	 * @this {CommentToken & {firstChild: Text}}
	 * @param {string} selector
	 */
	toString(selector) {
		const {firstChild: {data}, closed, nextSibling} = this;
		if (!closed && nextSibling) {
			Parser.error('自动闭合HTML注释', this);
			this.closed = true;
		}
		return selector && this.matches(selector)
			? ''
			: `<!--${data}${this.closed ? '-->' : ''}`; // eslint-disable-line unicorn/consistent-destructuring
	}

	/** @override */
	getPadding() {
		return 4;
	}
}

Parser.classes.CommentToken = __filename;
module.exports = CommentToken;
