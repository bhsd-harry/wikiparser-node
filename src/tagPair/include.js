'use strict';
const hidden = require('../../mixin/hidden');
const Parser = require('../../index');
const TagPairToken = require('.');

/**
 * `<includeonly>`或`<noinclude>`或`<onlyinclude>`
 * @classdesc `{childNodes: [AstText, AstText]}`
 */
class IncludeToken extends hidden(TagPairToken) {
	/** @browser */
	type = 'include';

	/**
	 * @browser
	 * @param name 标签名
	 * @param attr 标签属性
	 * @param inner 内部wikitext
	 * @param closed 是否封闭
	 */
	constructor(name, attr = '', inner = undefined, closed = undefined, config = Parser.getConfig(), accum = []) {
		super(name, attr, inner ?? '', inner === undefined ? closed : closed ?? '', config, accum);
	}

	/** @override */
	cloneNode() {
		const tags = this.getAttribute('tags'),
			config = this.getAttribute('config'),
			inner = this.selfClosing ? undefined : this.lastChild.data,
			closing = this.selfClosing || !this.closed ? undefined : tags[1];
		return Parser.run(() => new IncludeToken(tags[0], this.firstChild.data, inner, closing, config));
	}

	/**
	 * @override
	 * @param str 新文本
	 */
	setText(str) {
		return super.setText(str, 1);
	}

	/** 清除标签属性 */
	removeAttr() {
		super.setText('');
	}
}
Parser.classes.IncludeToken = __filename;
module.exports = IncludeToken;
