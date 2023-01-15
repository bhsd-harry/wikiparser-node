'use strict';

const Parser = require('..'),
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
	 * @param {string} url 网址
	 * @param {string} space 空白字符
	 * @param {string} text 链接文字
	 * @param {accum} accum
	 */
	constructor(url, space, text, config = Parser.getConfig(), accum = []) {
		super(undefined, config, true, accum);
		this.insertAt(new MagicLinkToken(url, true, config, accum));
		this.#space = space;
		if (text) {
			const inner = new Token(text, config, true, accum);
			inner.type = 'ext-link-text';
			this.insertAt(inner.setAttribute('stage', Parser.MAX_STAGE - 1));
		}
	}

	/** @override */
	toString(selector) {
		return this.childNodes.length === 1
			? `[${super.toString()}${this.#space}]`
			: `[${super.toString(selector, this.#space)}]`;
	}

	/** @override */
	getPadding() {
		return 1;
	}

	/** @override */
	getGaps() {
		return this.#space.length;
	}

	/** @override */
	print() {
		const {length} = this;
		return super.print(length > 1 ? {pre: '[', sep: this.#space, post: ']'} : {pre: '[', post: `${this.#space}]`});
	}
}

module.exports = ExtLinkToken;
