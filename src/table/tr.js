'use strict';

const Parser = require('../..'),
	Token = require('..'),
	SyntaxToken = require('../syntax'),
	AttributeToken = require('../attribute');

/**
 * 表格行，含开头的换行，不含结尾的换行
 * @classdesc `{childNodes: [SyntaxToken, AttributeToken, ?Token, ...TdToken]}`
 */
class TrToken extends Token {
	type = 'tr';

	/**
	 * @param {string} syntax 表格语法
	 * @param {string} attr 表格属性
	 * @param {accum} accum
	 * @param {RegExp} pattern 表格语法正则
	 */
	constructor(syntax, attr = '', config = Parser.getConfig(), accum = []) {
		super(undefined, config, true, accum);
		this.append(
			new SyntaxToken(syntax, 'table-syntax', config, accum),
			new AttributeToken(attr, 'table-attr', config, accum),
		);
	}
}

module.exports = TrToken;
