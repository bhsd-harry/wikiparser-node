'use strict';

const {typeError} = require('../../util/debug'),
	/** @type {Parser} */ Parser = require('../..'),
	TrToken = require('./tr'),
	SyntaxToken = require('../syntax');

/**
 * 表格
 * @classdesc `{childNodes: [SyntaxToken, AttributeToken, ?(string|Token), ...TdToken, ...TrToken, ?SyntaxToken]}`
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
		this.setAttribute('acceptable', {
			String: 2, Token: 2, SyntaxToken: [0, -1], AttributeToken: 1, TdToken: '2:', TrToken: '2:',
		});
	}

	/**
	 * @template {string|Token} T
	 * @param {T} token
	 */
	insertAt(token, i) {
		const previous = this.childNodes.at(i - 1),
			{closingPattern} = TableToken;
		if (token instanceof TrToken && token.type === 'td' && previous instanceof TrToken && previous.type === 'tr') {
			Parser.warn('改为将单元格插入当前行。');
			return previous.appendChild(token);
		} else if (i === this.childNodes.length && token instanceof SyntaxToken
			&& (token.getAttribute('pattern') !== closingPattern || !closingPattern.test(token.text()))
		) {
			throw new SyntaxError(`表格的闭合部分不符合语法！${token.toString().replaceAll('\n', '\\n')}`);
		}
		return super.insertAt(token, i);
	}

	close(syntax = '\n|}') {
		const config = this.getAttribute('config'),
			inner = Parser.parse(syntax, this.getAttribute('include'), 2, config),
			{lastElementChild} = this;
		if (!TableToken.closingPattern.test(inner.text())) {
			throw new SyntaxError(`表格的闭合部分不符合语法！${syntax.replaceAll('\n', '\\n')}`);
		} else if (lastElementChild instanceof SyntaxToken) {
			lastElementChild.replaceChildren(...inner.childNodes);
		} else {
			const {running} = Parser;
			Parser.running = true;
			const token = new SyntaxToken(undefined, TableToken.closingPattern, 'table-syntax', config, [], {
				'Stage-1': ':', '!ExtToken': '', TranscludeToken: ':',
			});
			token.replaceChildren(...inner.childNodes);
			this.appendChild(token);
			Parser.running = running;
		}
	}

	/** @returns {number} */
	getRowCount() {
		return super.getRowCount()
			+ this.children.filter(({type}) => type === 'tr').reduce((acc, cur) => acc + cur.getRowCount(), 0);
	}

	/** @param {number} n */
	getNthRow(n, force = false, insert = false) {
		if (typeof n !== 'number') {
			typeError(this, 'getNthRow', 'Number');
		}
		const nRows = this.getRowCount(),
			isRow = super.getRowCount();
		n = n < 0 ? n + nRows : n;
		if (n === 0 && (isRow || force && nRows === 0)) {
			return this;
		} else if (n < 0 || n > nRows || n === nRows && !insert) {
			throw new RangeError(`不存在第 ${n} 行！`);
		} else if (isRow) {
			n--;
		}
		let /** @type {TrToken} */ nextElementSibling = this.children.find(({type}) => type === 'tr'),
			rowCount = nextElementSibling?.getRowCount();
		if (nextElementSibling === undefined) {
			const {lastElementChild} = this;
			return lastElementChild instanceof SyntaxToken ? lastElementChild : undefined;
		}
		while (n > 0 || rowCount === 0) {
			n -= rowCount;
			({nextElementSibling} = nextElementSibling);
			rowCount = nextElementSibling instanceof TrToken && nextElementSibling.getRowCount();
		}
		return nextElementSibling;
	}

	/** @param {TableCoords} */
	getNthCell({row, column}) {
		return this.getNthRow(row).getNthCol(column);
	}

	/**
	 * @param {number} row
	 * @param {Record<string, string|boolean>} attr
	 * @returns {TrToken}
	 */
	insertTableRow(row, attr = {}) {
		if (typeof attr !== 'object') {
			typeError(this, 'insertTableRow', 'Object');
		}
		const reference = this.getNthRow(row, false, true),
			AttributeToken = require('../attribute'); // eslint-disable-line no-unused-vars
		Parser.running = true;
		/** @type {TrToken & AttributeToken}} */
		const token = new TrToken('\n|-', undefined, this.getAttribute('config'));
		Parser.running = false;
		for (const [k, v] of Object.entries(attr)) {
			token.setAttr(k, v);
		}
		return this.insertBefore(token, reference);
	}
}

Parser.classes.TableToken = __filename;
module.exports = TableToken;
