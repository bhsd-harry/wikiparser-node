'use strict';

const hidden = require('../../mixin/hidden'),
	{generateForSelf} = require('../../util/lint'),
	Parser = require('../..'),
	NowikiToken = require('.');

/**
 * HTML注释，不可见
 * @classdesc `{childNodes: [AstText]}`
 */
class CommentToken extends hidden(NowikiToken) {
	type = 'comment';
	closed;

	/** 内部wikitext */
	get innerText() {
		return String(this.firstChild);
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

	/** @override */
	getPadding() {
		return 4;
	}

	/** @override */
	print() {
		return super.print({pre: '&lt;!--', post: this.closed ? '--&gt;' : ''});
	}

	/**
	 * @override
	 * @param {number} start 起始位置
	 */
	lint(start = 0) {
		return this.closed ? [] : [generateForSelf(this, {start}, '未闭合的HTML注释')];
	}

	/**
	 * @override
	 * @param {string} selector
	 */
	toString(selector) {
		if (!this.closed && this.nextSibling) {
			Parser.error('自动闭合HTML注释', this);
			this.closed = true;
		}
		return selector && this.matches(selector)
			? ''
			: `<!--${String(this.firstChild)}${this.closed ? '-->' : ''}`;
	}

	/** @override */
	cloneNode() {
		return Parser.run(() => new CommentToken(String(this.firstChild), this.closed, this.getAttribute('config')));
	}
}

Parser.classes.CommentToken = __filename;
module.exports = CommentToken;
