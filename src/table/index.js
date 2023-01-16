'use strict';

const {generateForChild} = require('../../util/lint'),
	TrToken = require('./tr'),
	SyntaxToken = require('../syntax');

/**
 * 表格
 * @classdesc `{childNodes: [SyntaxToken, AttributeToken, ?Token, ...TdToken, ...TrToken, ?SyntaxToken]}`
 */
class TableToken extends TrToken {
	type = 'table';

	/** 表格是否闭合 */
	get closed() {
		return this.lastChild.type === 'table-syntax';
	}

	/**
	 * @override
	 * @param {number} start 起始位置
	 */
	lint(start = 0) {
		const errors = super.lint(start);
		if (!this.closed) {
			errors.push(generateForChild(this.firstChild, this.getRootNode().posFromIndex(start), '未闭合的表格'));
		}
		return errors;
	}

	/**
	 * 闭合表格语法
	 * @complexity `n`
	 * @param {string} syntax 表格结尾语法
	 */
	close(syntax = '\n|}', halfParsed = false) {
		const config = this.getAttribute('config'),
			accum = this.getAttribute('accum');
		super.insertAt(new SyntaxToken(syntax, null, 'table-syntax', config, accum));
	}
}

module.exports = TableToken;
