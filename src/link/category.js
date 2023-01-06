'use strict';

const Title = require('../../lib/title'),
	Parser = require('../..'),
	LinkToken = require('.'),
	Token = require('..');

/**
 * 分类
 * @classdesc `{childNodes: [AtomToken, ?Token]}`
 */
class CategoryToken extends LinkToken {
	type = 'category';

	setLangLink = undefined;
	setFragment = undefined;
	asSelfLink = undefined;
	pipeTrick = undefined;

	/** 分类排序关键字 */
	get sortkey() {
		return this.children[1]?.text()
			?.replaceAll(/&#(\d+);/gu, /** @param {string} p */ (_, p) => String.fromCodePoint(Number(p)))
			?.replaceAll(/&#x([\da-f]+);/giu, /** @param {string} p */ (_, p) => String.fromCodePoint(parseInt(p, 16)))
			?.replaceAll('\n', '') ?? '';
	}

	set sortkey(text) {
		this.setSortkey(text);
	}

	/**
	 * @param {string} link 分类名
	 * @param {string|undefined} text 排序关键字
	 * @param {Title} title 分类页面标题对象
	 * @param {accum} accum
	 */
	constructor(link, text, title, config = Parser.getConfig(), accum = []) {
		super(link, text, title, config, accum);
		this.seal(['setFragment', 'asSelfLink', 'pipeTrick'], true);
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
