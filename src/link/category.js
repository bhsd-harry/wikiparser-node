'use strict';

const {decodeHtml} = require('../../util/string'),
	Parser = require('../..'),
	LinkToken = require('.');

/**
 * 分类
 * @classdesc `{childNodes: [AtomToken, ?Token]}`
 */
class CategoryToken extends LinkToken {
	type = 'category';

	/** 分类排序关键字 */
	get sortkey() {
		return decodeHtml(this.childNodes[1]?.text());
	}

	set sortkey(text) {
		this.setSortkey(text);
	}

	/**
	 * @param {string} link 分类名
	 * @param {string|undefined} text 排序关键字
	 * @param {accum} accum
	 * @param {string} delimiter `|`
	 */
	constructor(link, text, config = Parser.getConfig(), accum = [], delimiter = '|') {
		super(link, text, config, accum, delimiter);
		this.seal(['selfLink', 'interwiki', 'setLangLink', 'setFragment', 'asSelfLink', 'pipeTrick'], true);
	}

	/**
	 * 设置排序关键字
	 * @param {string} text 排序关键字
	 */
	setSortkey(text) {
		this.setLinkText(text);
	}
}

Parser.classes.CategoryToken = __filename;
module.exports = CategoryToken;
