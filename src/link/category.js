'use strict';

const /** @type {Parser} */ Parser = require('../..'),
	LinkToken = require('.'); // eslint-disable-line no-unused-vars

/**
 * 分类
 * @classdesc `{childNodes: [AtomToken, ?Token]}`
 */
class CategoryToken extends LinkToken {
	type = 'category';

	/**
	 * @param {string} link
	 * @param {string|undefined} text
	 * @param {Title} title
	 * @param {accum} accum
	 */
	constructor(link, text, title, config = Parser.getConfig(), accum = []) {
		super(link, text, title, config, accum);
	}

	/** @returns {string} */
	text() {
		return `[[${this.firstElementChild.text()}]]`;
	}
}

module.exports = CategoryToken;
