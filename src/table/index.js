'use strict';

/** @typedef {import('./tr').TableCoords} TableCoords */
/** @typedef {import('.').TableRenderedCoords} TableRenderedCoords */
/** @typedef {import('..')} Token */

const {generateForChild} = require('../../util/lint'),
	{noWrap} = require('../../util/string'),
	// {isPlainObject} = require('../../util/base'),
	// assert = require('assert/strict'),
	Parser = require('../..'),
	TrToken = require('./tr'),
	TdToken = require('./td'),
	SyntaxToken = require('../syntax');

const openingPattern = /^(?:\{\||\{\{\{\s*!\s*\}\}|\{\{\s*\(!\s*\}\})$/u,
	closingPattern = /^\n[^\S\n]*(?:\|\}|\{\{\s*!\s*\}\}\}|\{\{\s*!\)\s*\}\})$/u;

/**
 * 比较两个表格坐标
 * @param {TableCoords} coords1 坐标1
 * @param {TableCoords} coords2 坐标2
 */
const cmpCoords = (coords1, coords2) => {
	const diff = coords1.row - coords2.row;
	return diff === 0 ? coords1.column - coords2.column : diff;
};

/**
 * 是否是行尾
 * @param {Token} cell 表格单元格
 */
const isRowEnd = ({type}) => type === 'tr' || type === 'table-syntax';

/** @extends {Array<TableCoords[]>} */
class Layout extends Array {
	/**
	 * 打印表格布局
	 * @complexity `n`
	 */
	print() {
		const hBorders = new Array(this.length + 1).fill().map((_, i) => {
				const prev = this[i - 1] ?? [],
					next = this[i] ?? [];
				return new Array(Math.max(prev.length, next.length)).fill().map((__, j) => prev[j] !== next[j]);
			}),
			vBorders = this.map(cur => new Array(cur.length + 1).fill().map((_, j) => cur[j - 1] !== cur[j]));
		let out = '';
		for (let i = 0; i <= this.length; i++) {
			const hBorder = hBorders[i].map(Number),
				vBorderTop = (vBorders[i - 1] ?? []).map(Number),
				vBorderBottom = (vBorders[i] ?? []).map(Number),
				// eslint-disable-next-line no-sparse-arrays
				border = [' ',,, '┌',, '┐', '─', '┬',, '│', '└', '├', '┘', '┤', '┴', '┼'];
			for (let j = 0; j <= hBorder.length; j++) {
				// eslint-disable-next-line no-bitwise
				const bit = (vBorderTop[j] << 3) + (vBorderBottom[j] << 0) + (hBorder[j - 1] << 2) + (hBorder[j] << 1);
				out += `${border[bit]}${hBorder[j] ? '─' : ' '}`;
			}
			out += '\n';
		}
		console.log(out.slice(0, -1));
	}
}

/**
 * 表格
 * @classdesc `{childNodes: [SyntaxToken, AttributesToken, ?Token, ...TdToken, ...TrToken, ?SyntaxToken]}`
 */
class TableToken extends TrToken {
	/** @type {'table'} */ type = 'table';

	/** 表格是否闭合 */
	get closed() {
		return this.lastChild.type === 'table-syntax';
	}

	set closed(closed) {
		if (closed === true && !this.closed) {
			this.close(this.closest('parameter') ? '\n{{!)}}' : '\n|}');
		}
	}

	/**
	 * @param {string} syntax 表格语法
	 * @param {string} attr 表格属性
	 * @param {Token[]} accum
	 */
	constructor(syntax, attr = '', config = Parser.getConfig(), accum = []) {
		super(syntax, attr, config, accum, openingPattern);
		this.setAttribute('acceptable', {
			Token: 2, SyntaxToken: [0, -1], AttributesToken: 1, TdToken: '2:', TrToken: '2:',
		});
	}

	/**
	 * @override
	 * @template {string|import('../../lib/text')|Token} T
	 * @param {T} token 待插入的子节点
	 * @param {number} i 插入位置
	 * @complexity `n`
	 * @throws `SyntaxError` 表格的闭合部分非法
	 */
	insertAt(token, i = this.length) {
		const previous = this.childNodes.at(i - 1);
		if (typeof token !== 'string' && token.type === 'td' && previous.type === 'tr') {
			Parser.warn('改为将单元格插入当前行。');
			return previous.insertAt(token);
		} else if (i > 0 && i === this.length && token instanceof SyntaxToken
			&& (token.getAttribute('pattern') !== closingPattern || !closingPattern.test(token.text()))
		) {
			throw new SyntaxError(`表格的闭合部分不符合语法！${noWrap(String(token))}`);
		}
		return super.insertAt(token, i);
	}

	/**
	 * @override
	 * @param {number} start 起始位置
	 */
	lint(start = this.getAbsoluteIndex()) {
		const errors = super.lint(start);
		if (!this.closed) {
			const {firstChild, lastChild: tr} = this,
				{lastChild: td} = tr,
				error = generateForChild(firstChild, {start}, 'unclosed table');
			errors.push({...error, excerpt: String(td?.type === 'td' ? td : tr).slice(0, 50)});
		}
		return errors;
	}

	/**
	 * 闭合表格语法
	 * @complexity `n`
	 * @param {string} syntax 表格结尾语法
	 * @throws `SyntaxError` 表格的闭合部分不符合语法
	 */
	close(syntax = '\n|}', halfParsed = false) {
		halfParsed &&= Parser.running;
		const config = this.getAttribute('config'),
			accum = this.getAttribute('accum'),
			inner = !halfParsed && Parser.parse(syntax, this.getAttribute('include'), 2, config),
			{lastChild} = this;
		if (!halfParsed && !closingPattern.test(inner.text())) {
			throw new SyntaxError(`表格的闭合部分不符合语法！${noWrap(syntax)}`);
		} else if (lastChild instanceof SyntaxToken) {
			lastChild.replaceChildren(...inner.childNodes);
		} else {
			super.insertAt(Parser.run(() => {
				const token = new SyntaxToken(syntax, closingPattern, 'table-syntax', config, accum, {
					'Stage-1': ':', '!ExtToken': '', TranscludeToken: ':',
				});
				if (inner) {
					token.replaceChildren(...inner.childNodes);
				}
				return token;
			}));
		}
	}

	/**
	 * @override
	 * @returns {number}
	 * @complexity `n`
	 */
	getRowCount() {
		return super.getRowCount()
			+ this.childNodes.filter(child => child.type === 'tr' && /** @type {TrToken} */ (child).getRowCount())
				.length;
	}

	/** @override */
	getPreviousRow() { // eslint-disable-line class-methods-use-this
		return undefined;
	}

	/**
	 * @override
	 * @complexity `n`
	 */
	getNextRow() {
		return this.getNthRow(super.getRowCount() ? 1 : 0, false, false);
	}

	/**
	 * 获取第n行
	 * @template {boolean} T
	 * @param {number} n 行号
	 * @param {boolean} force 是否将表格自身视为第一行
	 * @param {T} insert 是否用于判断插入新行的位置
	 * @returns {T extends false ? TrToken : TrToken|SyntaxToken}
	 * @complexity `n`
	 * @throws `RangeError` 不存在该行
	 */
	getNthRow(n, force = false, insert = /** @type {T} */ (false)) {
		if (!Number.isInteger(n)) {
			this.typeError('getNthRow', 'Number');
		}
		const nRows = this.getRowCount(),
			isRow = super.getRowCount();
		n = n < 0 ? n + nRows : n;
		if (n === 0 && (isRow || force && nRows === 0)) {
			// eslint-disable-next-line no-extra-parens
			return /** @type {T extends false ? TrToken : TrToken|SyntaxToken} */ (/** @type {TrToken} */ (this));
		} else if (n < 0 || n > nRows || n === nRows && !insert) {
			throw new RangeError(`不存在第 ${n} 行！`);
		} else if (isRow) {
			n--;
		}
		for (const child of this.childNodes.slice(2)) {
			if (child.type === 'tr' && /** @type {TrToken} */ (child).getRowCount()) {
				n--;
				if (n < 0) {
					return /** @type {T extends false ? TrToken : TrToken|SyntaxToken} */ (child);
				}
			} else if (child.type === 'table-syntax') {
				return /** @type {T extends false ? TrToken : TrToken|SyntaxToken} */ (child);
			}
		}
		return undefined;
	}

	/**
	 * 获取所有行
	 * @complexity `n`
	 */
	getAllRows() {
		const {childNodes: [, ...childNodes]} = this;
		return [
			...super.getRowCount() ? [this] : [],
			.../** @type {TrToken[]} */(childNodes).filter(child => child.type === 'tr' && child.getRowCount()),
		];
	}

	/**
	 * 获取指定坐标的单元格
	 * @param {TableCoords & TableRenderedCoords} coords 表格坐标
	 * @complexity `n`
	 */
	getNthCell(coords) {
		if (coords.row === undefined) {
			coords = this.toRawCoords(coords);
		}
		return coords && this.getNthRow(coords.row, false, false).getNthCol(coords.column);
	}

	/**
	 * 获取表格布局
	 * @param {TableCoords & TableRenderedCoords} stop 中止条件
	 * @complexity `n`
	 */
	getLayout(stop = {}) {
		const rows = this.getAllRows(),
			{length} = rows,
			layout = new Layout(...new Array(length).fill().map(() => []));
		for (let i = 0; i < length; i++) {
			if (i > (stop.row ?? stop.y)) {
				break;
			}
			const rowLayout = layout[i];
			let j = 0,
				k = 0,
				last;
			for (const cell of rows[i].childNodes.slice(2)) {
				if (cell instanceof TdToken) {
					if (cell.isIndependent()) {
						last = cell.subtype !== 'caption';
					}
					if (last) {
						const /** @type {TableCoords} */ coords = {row: i, column: j},
							{rowspan, colspan} = cell;
						j++;
						while (rowLayout[k]) {
							k++;
						}
						if (i === stop.row && j > stop.column) {
							layout[i][k] = coords;
							return layout;
						}
						for (let y = i; y < Math.min(i + rowspan, length); y++) {
							for (let x = k; x < k + colspan; x++) {
								layout[y][x] = coords;
							}
						}
						k += colspan;
						if (i === stop.y && k > stop.x) {
							return layout;
						}
					}
				} else if (isRowEnd(cell)) {
					break;
				}
			}
		}
		return layout;
	}

	/**
	 * 打印表格布局
	 * @complexity `n`
	 */
	printLayout() {
		this.getLayout().print();
	}

	/**
	 * 转换为渲染后的表格坐标
	 * @param {TableCoords} coord wikitext中的表格坐标
	 * @returns {TableRenderedCoords}
	 * @complexity `n`
	 */
	toRenderedCoords({row, column}) {
		if (!Number.isInteger(row) || !Number.isInteger(column)) {
			this.typeError('toRenderedCoords', 'Number');
		}
		const rowLayout = this.getLayout({row, column})[row],
			x = rowLayout?.findIndex(coords => cmpCoords(coords, {row, column}) === 0);
		return rowLayout && (x === -1 ? undefined : {y: row, x});
	}

	/**
	 * 转换为wikitext中的表格坐标
	 * @param {TableRenderedCoords} coord 渲染后的表格坐标
	 * @complexity `n`
	 */
	toRawCoords({x, y}) {
		if (!Number.isInteger(x) || !Number.isInteger(y)) {
			this.typeError('toRawCoords', 'Number');
		}
		const rowLayout = this.getLayout({x, y})[y],
			coords = rowLayout?.[x];
		if (coords) {
			return {...coords, start: coords.row === y && rowLayout[x - 1] !== coords};
		} else if (rowLayout || y > 0) {
			return x === rowLayout?.length
				? {row: y, column: (rowLayout.findLast(({row}) => row === y)?.column ?? -1) + 1, start: true}
				: undefined;
		}
		return {row: 0, column: 0, start: true};
	}
}

Parser.classes.TableToken = __filename;
module.exports = TableToken;
