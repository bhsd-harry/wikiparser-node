'use strict';

const {generateForChild} = require('../../util/lint'),
	Parser = require('../..'),
	AstText = require('../../lib/text'),
	Token = require('..'),
	AtomToken = require('../atom');

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
		super(undefined, config, true, accum, {
		});
		this.insertAt(new AtomToken(link, 'link-target', config, accum, {
		}));
		if (linkText !== undefined) {
			const inner = new Token(linkText, config, true, accum, {
			});
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
			this.#delimiter = this.getAttribute('buildFromStr')(this.#delimiter, 'string');
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
	text() {
		const str = super.text('|');
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

	/**
	 * @override
	 * @param {number} start 起始位置
	 */
	lint(start = 0) {
		const errors = super.lint(start),
			{childNodes: [, linkText]} = this;
		if (linkText?.childNodes?.some(
			/** @param {AstText} */ ({type, data}) => type === 'text' && data.includes('|'),
		)) {
			errors.push(generateForChild(linkText, {token: this, start}, '链接文本中多余的"|"'));
		}
		return errors;
	}
}

module.exports = LinkToken;
