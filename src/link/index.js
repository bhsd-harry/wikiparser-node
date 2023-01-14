'use strict';

const Parser = require('../..'),
	Token = require('..');

/**
 * 内链
 * @classdesc `{childNodes: [AtomToken, ?Token]}`
 */
class LinkToken extends Token {
	type = 'link';

	/**
	 * @param {string} link 链接标题
	 * @param {string|undefined} linkText 链接显示文字
	 * @param {accum} accum
	 */
	constructor(link, linkText, config = Parser.getConfig(), accum = []) {
		super(undefined, config, true, accum);
		const AtomToken = require('../atom');
		this.insertAt(new AtomToken(link, 'link-target', config, accum));
		if (linkText !== undefined) {
			const inner = new Token(linkText, config, true, accum);
			inner.type = 'link-text';
			this.insertAt(inner.setAttribute('stage', Parser.MAX_STAGE - 1));
		}
	}

	/** @override */
	toString() {
		const str = super.toString('|');
		return this.type === 'gallery-image' ? str : `[[${str}]]`;
	}

	/** @override */
	getPadding() {
		return 2;
	}

	/** @override */
	getGaps() {
		return 1;
	}

	/** @override */
	print() {
		return super.print(this.type === 'gallery-image' ? {sep: '|'} : {pre: '[[', post: ']]', sep: '|'});
	}
}

module.exports = LinkToken;
