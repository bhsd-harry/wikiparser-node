'use strict';

const Title = require('../../lib/title'),
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
		return this.childNodes[1]?.text()?.replaceAll(
			/&#(\d+|x[\da-f]+);|\n/gu,
			/** @param {string} p */
			(_, p) => p ? String.fromCodePoint(p[0] === 'x' ? parseInt(p.slice(1), 16) : Number(p)) : '',
		);
	}

	set sortkey(text) {
		this.setSortkey(text);
	}

	/**
	 * @param {string} link 分类名
	 * @param {string|undefined} text 排序关键字
	 * @param {Title} title 分类页面标题对象
	 * @param {accum} accum
	 * @param {string} delimiter `|`
	 */
	constructor(link, text, title, config = Parser.getConfig(), accum = [], delimiter = '|') {
		super(link, text, title, config, accum, delimiter);
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
