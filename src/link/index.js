'use strict';

const Parser = require('../..'),
	Token = require('..');

/**
 * 内链
 * @classdesc `{childNodes: [AtomToken, ?Token]}`
 */
class LinkToken extends Token {
	type = 'link';
	#bracket = true;

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

	/**
	 * @override
	 * @template {string} T
	 * @param {T} key 属性键
	 * @param {TokenAttribute<T>} value 属性值
	 */
	setAttribute(key, value) {
		if (key === 'bracket') {
			this.#bracket = Boolean(value);
			return this;
		}
		return super.setAttribute(key, value);
	}

	/** @override */
	toString(selector) {
		const str = super.toString(selector, '|');
		return this.#bracket ? `[[${str}]]` : str;
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
		return super.print(this.#bracket ? {pre: '[[', post: ']]', sep: '|'} : {sep: '|'});
	}
}

module.exports = LinkToken;
