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
	#fragment = '';
	#encoded = false;

	/**
	 * @param {string} link 链接标题
	 * @param {string|undefined} linkText 链接显示文字
	 * @param {accum} accum
	 * @param {string} delimiter `|`
	 */
	constructor(link, linkText, config = Parser.getConfig(), accum = [], delimiter = '|') {
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
		const titleObj = this.normalizeTitle(this.firstChild.text(), 0, false, true, true);
		this.#fragment = titleObj.fragment;
		this.#encoded = titleObj.encoded;
		if (this.#delimiter?.includes('\0')) {
			this.#delimiter = this.getAttribute('buildFromStr')(this.#delimiter, 'string');
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

	/** @override */
	print() {
		return super.print(this.#bracket ? {pre: '[[', post: ']]', sep: this.#delimiter} : {sep: this.#delimiter});
	}

	/**
	 * @override
	 * @param {number} start 起始位置
	 */
	lint(start = 0) {
		const errors = super.lint(start),
			{childNodes: [target, linkText], type: linkType} = this;
		let rect;
		if (this.#encoded && !this.interwiki) {
			rect = {start, ...this.getRootNode().posFromIndex(start)};
			errors.push(generateForChild(target, rect, '内链中不必要的URL编码'));
		}
		if (linkType === 'link' && linkText?.childNodes?.some(
			/** @param {AstText} */ ({type, data}) => type === 'text' && data.includes('|'),
		)) {
			rect ||= {start, ...this.getRootNode().posFromIndex(start)};
			errors.push(generateForChild(linkText, rect, '链接文本中多余的"|"', 'warning'));
		} else if (linkType !== 'link' && this.#fragment) {
			rect ||= {start, ...this.getRootNode().posFromIndex(start)};
			errors.push(generateForChild(target, rect, '多余的fragment'));
		}
		return errors;
	}
}

module.exports = LinkToken;
