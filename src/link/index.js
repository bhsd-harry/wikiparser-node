'use strict';

const /** @type {Parser} */ Parser = require('../..'),
	Token = require('..');

/**
 * 内链
 * @classdesc `{childNodes: [AtomToken, ?Token]}`
 */
class LinkToken extends Token {
	type = 'link';

	/**
	 * @param {string} link
	 * @param {string|undefined} linkText
	 * @param {accum} accum
	 */
	constructor(link, linkText, title, config = Parser.getConfig(), accum = []) {
		super(undefined, config, true, accum);
		const AtomToken = require('../atom');
		this.appendChild(new AtomToken(link, 'link-target', config, accum));
		if (linkText !== undefined) {
			const inner = new Token(linkText, config, true, accum);
			inner.type = 'link-text';
			this.appendChild(inner.setAttribute('stage', Parser.MAX_STAGE - 1));
		}
	}

	toString() {
		const str = super.toString('|');
		return this.type === 'gallery-image' ? str : `[[${str}]]`;
	}

	print() {
		return super.print(this.type === 'gallery-image' ? {sep: '|'} : {pre: '[[', post: ']]', sep: '|'});
	}

	text() {
		const str = super.text('|');
		return this.type === 'gallery-image' ? str : `[[${str}]]`;
	}
}

module.exports = LinkToken;
