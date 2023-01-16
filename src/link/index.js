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
	#delimiter;

	/**
	 * @param {string} link 链接标题
	 * @param {string|undefined} linkText 链接显示文字
	 * @param {accum} accum
	 * @param {string} delimiter `|`
	 */
	constructor(link, linkText, title, config = Parser.getConfig(), accum = [], delimiter = '|') {
		super(undefined, config, true, accum, {AtomToken: 0, Token: 1});
		const AtomToken = require('../atom');
		this.insertAt(new AtomToken(link, 'link-target', config, accum, {
			'Stage-2': ':', '!ExtToken': '', '!HeadingToken': '',
		}));
		if (linkText !== undefined) {
			const inner = new Token(linkText, config, true, accum, {'Stage-5': ':', ConverterToken: ':'});
			inner.type = 'link-text';
			this.insertAt(inner.setAttribute('stage', Parser.MAX_STAGE - 1));
		}
		this.#delimiter = delimiter;
	}

	/**
	 * @override
	 */
	afterBuild() {
		if (this.#delimiter?.includes('\0')) {
			this.#delimiter = this.getAttribute('buildFromStr')(this.#delimiter).map(String).join('');
		}
		return this;
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

	/**
	 * @override
	 */
	toString(selector) {
		const str = super.toString(selector, this.#delimiter);
		return this.#bracket ? `[[${str}]]` : str;
	}

	/** @override */
	getPadding() {
		return 2;
	}

	/** @override */
	getGaps() {
		return this.#delimiter.length;
	}

	/** @override */
	print() {
		return super.print(this.#bracket ? {pre: '[[', post: ']]', sep: this.#delimiter} : {sep: this.#delimiter});
	}
}

module.exports = LinkToken;
