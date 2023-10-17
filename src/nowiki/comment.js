'use strict';
const hidden = require('../../mixin/hidden');
const lint_1 = require('../../util/lint');
const {generateForSelf} = lint_1;
const Parser = require('../../index');
const NowikiBaseToken = require('./base');

/** HTML注释，不可见 */
class CommentToken extends hidden(NowikiBaseToken) {
	/** @browser */
	type = 'comment';
	closed;

	/** 内部wikitext */
	get innerText() {
		return this.firstChild.data;
	}

	/**
	 * @browser
	 * @param closed 是否闭合
	 */
	constructor(wikitext, closed = true, config = Parser.getConfig(), accum = []) {
		super(wikitext, config, accum);
		this.closed = closed;
		Object.defineProperty(this, 'closed', {enumerable: false});
	}

	/** @private */
	getPadding() {
		return 4;
	}

	/**
	 * @override
	 * @browser
	 */
	print() {
		return super.print({pre: '&lt;!--', post: this.closed ? '--&gt;' : ''});
	}

	/**
	 * @override
	 * @browser
	 */
	lint(start = this.getAbsoluteIndex()) {
		return this.closed ? [] : [generateForSelf(this, {start}, 'unclosed HTML comment')];
	}

	/**
	 * @override
	 * @browser
	 */
	toString(selector) {
		if (!this.closed && this.nextSibling) {
			Parser.error('自动闭合HTML注释', this);
			this.closed = true;
		}
		return selector && this.matches(selector)
			? ''
			: `<!--${this.firstChild.data}${this.closed ? '-->' : ''}`;
	}

	/** @override */
	cloneNode() {
		return Parser.run(() => new CommentToken(this.firstChild.data, this.closed, this.getAttribute('config')));
	}
}
Parser.classes.CommentToken = __filename;
module.exports = CommentToken;
