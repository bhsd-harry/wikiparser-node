'use strict';

const TrToken = require('./tr'),
	SyntaxToken = require('../syntax');

/**
 * 表格
 * @classdesc `{childNodes: [SyntaxToken, AttributeToken, ?Token, ...TdToken, ...TrToken, ?SyntaxToken]}`
 */
class TableToken extends TrToken {
	type = 'table';

	/**
	 * 闭合表格语法
	 * @complexity `n`
	 * @param {string} syntax 表格结尾语法
	 */
	close(syntax = '\n|}') {
		const config = this.getAttribute('config'),
			accum = this.getAttribute('accum');
		this.appendChild(new SyntaxToken(syntax, 'table-syntax', config, accum));
	}
}

module.exports = TableToken;
