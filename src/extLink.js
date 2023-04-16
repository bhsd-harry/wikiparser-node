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
	 * @param {Token[]} accum
	 */
	constructor(url, space = '', text = '', config = Parser.getConfig(), accum = []) {
		super(undefined, config, true, accum, {
		});
		this.insertAt(new MagicLinkToken(url, true, config, accum));
		this.#space = space;
		if (text) {
			const inner = new Token(text, config, true, accum, {
			});
			inner.type = 'ext-link-text';
			this.insertAt(inner.setAttribute('stage', Parser.MAX_STAGE - 1));
		}
	}

	/**
	 * @override
	 */
	toString(selector) {
		if (this.length === 1) {
			return `[${super.toString(selector)}${this.#space}]`;
		}
		return `[${super.toString(selector, this.#space)}]`;
	}

	/** @override */
	text() {
		return `[${super.text(' ')}]`;
	}

	/** @override */
	getPadding() {
		return 1;
	}

	/** @override */
	getGaps() {
		return this.#space.length;
	}
}

module.exports = ExtLinkToken;
