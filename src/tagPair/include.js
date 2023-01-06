'use strict';

const hidden = require('../../mixin/hidden'),
	Parser = require('../..'),
	Text = require('../../lib/text'),
	TagPairToken = require('.');

/**
 * `<includeonly>`或`<noinclude>`
 * @classdesc `{childNodes: [Text, Text]}`
 */
class IncludeToken extends hidden(TagPairToken) {
	type = 'include';

	/**
	 * @param {string} name 标签名
	 * @param {string} attr 标签属性
	 * @param {string|undefined} inner 内部wikitext
	 * @param {string|undefined} closed 是否封闭
	 * @param {accum} accum
	 */
	constructor(name, attr = '', inner = undefined, closed = undefined, config = Parser.getConfig(), accum = []) {
		super(name, attr, inner ?? '', inner === undefined ? closed : closed ?? '', config, accum, {Text: [0, 1]});
	}

	/**
	 * @override
	 * @this {IncludeToken & {firstChild: Text, lastChild: Text}}
	 */
	cloneNode() {
		const tags = this.getAttribute('tags'),
			config = this.getAttribute('config'),
			inner = this.selfClosing ? undefined : this.lastChild.data,
			closing = this.selfClosing || !this.closed ? undefined : tags[1],
			token = Parser.run(() => new IncludeToken(tags[0], this.firstChild.data, inner, closing, config));
		return token;
	}

	/**
	 * @override
	 * @param {string} str 新文本
	 */
	setText(str) {
		return super.setText(str, 1);
	}

	/** 清除标签属性 */
	removeAttr() {
		super.setText('', 0);
	}
}

Parser.classes.IncludeToken = __filename;
module.exports = IncludeToken;
