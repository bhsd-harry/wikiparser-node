'use strict';

const /** @type {Parser} */ Parser = require('..'),
	Token = require('.'),
	MagicLinkToken = require('./magicLink');

/**
 * 外链
 * @classdesc `{childNodes: [MagicLinkToken, ?Token]}`
 */
class ExtLinkToken extends Token {
	type = 'ext-link';
	#space;

	/**
	 * @param {string} url
	 * @param {string} space
	 * @param {string} text
	 * @param {accum} accum
	 */
	constructor(url, space, text, config = Parser.getConfig(), accum = []) {
		super(undefined, config, true, accum);
		this.appendChild(new MagicLinkToken(url, true, config, accum));
		this.#space = space;
		if (text) {
			const inner = new Token(text, config, true, accum);
			inner.type = 'ext-link-text';
			this.appendChild(inner.setAttribute('stage', Parser.MAX_STAGE - 1));
		}
	}

	toString() {
		return `[${this.firstElementChild.toString()}${this.#space}${this.children[1]?.toString() ?? ''}]`;
	}

	print() {
		const {childNodes: {length}} = this;
		return super.print({pre: '[', sep: length > 1 ? this.#space : '', post: length > 1 ? ']' : `${this.#space}]`});
	}
}

module.exports = ExtLinkToken;
