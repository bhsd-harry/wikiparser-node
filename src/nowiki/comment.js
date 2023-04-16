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
	/** @type {'comment'} */ type = 'comment';
	closed;

	/**
	 * @param {string} wikitext wikitext
	 * @param {boolean} closed 是否闭合
	 * @param {import('..')[]} accum
	 */
	constructor(wikitext, closed = true, config = Parser.getConfig(), accum = []) {
		super(wikitext, config, accum);
		this.closed = closed;
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
	lint(start) {
		return this.closed ? [] : [generateForSelf(this, {start}, 'unclosed HTML comment')];
	}

	/**
	 * @override
	 */
	toString(selector) {
		return `<!--${String(this.firstChild)}${this.closed ? '-->' : ''}`;
	}
}

module.exports = CommentToken;
