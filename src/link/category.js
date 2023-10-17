'use strict';
const string_1 = require('../../util/string');
const {decodeHtml} = string_1;
const Parser = require('../../index');
const LinkToken = require('.');

/** 分类 */
class CategoryToken extends LinkToken {
	/** @browser */
	type = 'category';

	/** 分类排序关键字 */
	get sortkey() {
		const {childNodes: [, child]} = this;
		return child && decodeHtml(child.text());
	}

	set sortkey(text) {
		this.setSortkey(text);
	}

	/**
	 * 设置排序关键字
	 * @param text 排序关键字
	 */
	setSortkey(text) {
		this.setLinkText(text);
	}
}
Parser.classes.CategoryToken = __filename;
module.exports = CategoryToken;
