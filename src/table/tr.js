'use strict';
const Parser = require('../../index');
const TrBaseToken = require('./trBase');

/**
 * 表格行，含开头的换行，不含结尾的换行
 * @classdesc `{childNodes: [SyntaxToken, AttributesToken, ?Token, ...TdToken]}`
 */
class TrToken extends TrBaseToken {
	/** @browser */
	type = 'tr';

	/**
	 * @browser
	 * @param syntax 表格语法
	 * @param attr 表格属性
	 */
	constructor(syntax, attr = '', config = Parser.getConfig(), accum = []) {
		super(/^\n[^\S\n]*(?:\|-+|\{\{\s*!\s*\}\}-+|\{\{\s*!-\s*\}\}-*)$/u, syntax, attr, config, accum, {
			Token: 2, SyntaxToken: 0, AttributesToken: 1, TdToken: '2:',
		});
	}

	/**
	 * 获取相邻行
	 * @param subset 筛选兄弟节点的方法
	 */
	#getSiblingRow(subset) {
		const {parentNode} = this;
		if (!parentNode) {
			return undefined;
		}
		const {childNodes} = parentNode,
			index = childNodes.indexOf(this);
		for (const child of subset(childNodes, index)) {
			if (child instanceof TrToken && child.getRowCount()) {
				return child;
			}
		}
		return undefined;
	}

	/** 获取下一行 */
	getNextRow() {
		return this.#getSiblingRow((childNodes, index) => childNodes.slice(index + 1));
	}

	/** 获取前一行 */
	getPreviousRow() {
		return this.#getSiblingRow((childNodes, index) => childNodes.slice(0, index).reverse());
	}
}
Parser.classes.TrToken = __filename;
module.exports = TrToken;
