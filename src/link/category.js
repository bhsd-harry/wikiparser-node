'use strict';

const /** @type {Parser} */ Parser = require('../..'),
	LinkToken = require('.');

/**
 * 分类
 * @classdesc `{childNodes: [AtomToken, ?Token]}`
 */
class CategoryToken extends LinkToken {
	type = 'category';

	/**
	 * @param {string} link
	 * @param {string|undefined} text
	 * @param {accum} accum
	 */
	constructor(link, text, title, config = Parser.getConfig(), accum = []) {
		super(link, text, title, config, accum);
	}
}

module.exports = CategoryToken;
