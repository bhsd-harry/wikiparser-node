'use strict';

const /** @type {Parser} */ Parser = require('../..'),
	Token = require('..'),
	SyntaxToken = require('../syntax'),
	AttributeToken = require('../attribute');

/**
 * 表格行，含开头的换行，不含结尾的换行
 * @classdesc `{childNodes: [SyntaxToken, AttributeToken, ?Token, ...TdToken]}`
 */
class TrToken extends Token {
	type = 'tr';

	static openingPattern = /^\n[^\S\n]*(?:\|-+|\{\{\s*!\s*\}\}-+|\{\{\s*!-\s*\}\}-*)$/;

	/**
	 * @param {string} syntax
	 * @param {accum} accum
	 */
	constructor(syntax, attr = '', config = Parser.getConfig(), accum = [], pattern = TrToken.openingPattern) {
		super(undefined, config, true, accum);
		this.append(
			new SyntaxToken(syntax, pattern, 'table-syntax', config, accum),
			new AttributeToken(attr, 'table-attr', 'tr', config, accum),
		);
	}
}

module.exports = TrToken;
