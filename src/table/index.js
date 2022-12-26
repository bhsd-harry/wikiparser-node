'use strict';

const /** @type {Parser} */ Parser = require('../..'),
	TrToken = require('./tr'),
	SyntaxToken = require('../syntax');

/**
 * 表格
 * @classdesc `{childNodes: [SyntaxToken, AttributeToken, ?Token, ...TdToken, ...TrToken, ?SyntaxToken]}`
 */
class TableToken extends TrToken {
	type = 'table';

	static openingPattern = /^(?:{\||{{{\s*!\s*}}|{{\s*\(!\s*}})$/;
	static closingPattern = /^\n[^\S\n]*(?:\|}|{{\s*!\s*}}}|{{\s*!\)\s*}})$/;

	/**
	 * @param {string} syntax
	 * @param {accum} accum
	 */
	constructor(syntax, attr = '', config = Parser.getConfig(), accum = []) {
		super(syntax, attr, config, accum, TableToken.openingPattern);
	}

	/** @complexity `n` */
	close(syntax = '\n|}') {
		const config = this.getAttribute('config'),
			accum = this.getAttribute('accum'),
			{closingPattern} = TableToken;
		this.appendChild(Parser.run(() => new SyntaxToken(syntax, closingPattern, 'table-syntax', config, accum)));
	}
}

module.exports = TableToken;
