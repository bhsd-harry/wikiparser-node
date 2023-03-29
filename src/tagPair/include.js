'use strict';

const hidden = require('../../mixin/hidden'),
	Parser = require('../..'),
	TagPairToken = require('.');

/**
 * `<includeonly>`或`<noinclude>`
 * @classdesc `{childNodes: [AstText, AstText]}`
 */
class IncludeToken extends hidden(TagPairToken) {
	type = 'include';

	/**
	 * @param {string} name 标签名
	 * @param {string} attr 标签属性
	 * @param {string|undefined} inner 内部wikitext
	 * @param {string|undefined} closed 是否封闭
	 * @param {import('../../typings/token').accum} accum
	 */
	constructor(name, attr = '', inner = undefined, closed = undefined, config = Parser.getConfig(), accum = []) {
		super(name, attr, inner ?? '', inner === undefined ? closed : closed ?? '', config, accum);
	}
}

module.exports = IncludeToken;
