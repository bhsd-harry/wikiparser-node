import {generateForChild} from '../../util/lint';
import {noWrap} from '../../util/string';
import {isPlainObject} from '../../util/base';
import * as assert from 'assert/strict';
import * as Parser from '../../index';
import Token = require('..');
import TrToken = require('./tr');
import TrBaseToken = require('./trBase');
import type {TableCoords, TableRenderedCoords} from './trBase';
import TdToken = require('./td');
import type {TdAttrs} from './td';
import SyntaxToken = require('../syntax');
import AttributesToken = require('../attributes');

const closingPattern = /^\n[^\S\n]*(?:\|\}|\{\{\s*!\s*\}\}\}|\{\{\s*!\)\s*\}\})$/u;

/**
 * 比较两个表格坐标
 * @param coords1 坐标1
 * @param coords2 坐标2
 */
const cmpCoords = (coords1: TableCoords, coords2: TableCoords): number => {
	const diff = coords1.row - coords2.row;
	return diff === 0 ? coords1.column - coords2.column : diff;
};

/**
 * 是否是行尾
 * @param {Token} cell 表格单元格
 */
const isRowEnd = ({type}: Token): boolean => type === 'tr' || type === 'table-syntax';

/**
 * 是否是合并单元格的第一列
 * @param rowLayout 行布局
 * @param i 单元格序号
 * @param oneCol 是否仅有一列
 */
const isStartCol = (rowLayout: TableCoords[], i: number, oneCol = false): boolean => {
	const coords = rowLayout[i];
	return rowLayout[i - 1] !== coords && (!oneCol || rowLayout[i + 1] !== coords);
};

/**
 * 设置表格格式
 * @param cells 单元格
 * @param attr 属性
 * @param multi 是否对所有单元格设置，或是仅对行首单元格设置
 */
const format = (cells: Map<TdToken, boolean>, attr: TdAttrs | string = {}, multi = false): void => {
	for (const [token, start] of cells) {
		if (multi || start) {
			if (typeof attr === 'string') {
				token.setSyntax(attr);
			} else {
				for (const [k, v] of Object.entries(attr)) {
					token.setAttr(k, v as string | true);
				}
			}
		}
	}
};

/**
 * 填补缺失单元格
 * @param y 行号
 * @param rowToken 表格行
 * @param layout 表格布局
 * @param maxCol 最大列数
 * @param token 待填充的单元格
 */
const fill = (y: number, rowToken: TrBaseToken, layout: Layout, maxCol: number, token: Token): void => {
	const rowLayout = layout[y]!,
		lastIndex = rowToken.childNodes.findLastIndex(child => child instanceof TdToken && child.subtype !== 'caption'),
		pos = lastIndex + 1 || undefined;
	Parser.run(() => {
		for (let i = 0; i < maxCol; i++) {
			if (!rowLayout[i]) {
				rowToken.insertAt(token.cloneNode(), pos);
			}
		}
	});
};

/** @extends {Array<TableCoords[]>} */
class Layout extends Array<TableCoords[]> {
	/** 打印表格布局 */
	print(): void {
		const hBorders = new Array(this.length + 1).fill(undefined).map((_, i) => {
				const prev = this[i - 1] ?? [],
					next = this[i] ?? [];
				return new Array(Math.max(prev.length, next.length)).fill(undefined)
					.map((__, j) => prev[j] !== next[j]);
			}),
			vBorders = this.map(cur => new Array(cur.length + 1).fill(undefined).map((_, j) => cur[j - 1] !== cur[j]));
		let out = '';
		for (let i = 0; i <= this.length; i++) {
			const hBorder = hBorders[i]!.map(Number),
				vBorderTop = (vBorders[i - 1] ?? []).map(Number),
				vBorderBottom = (vBorders[i] ?? []).map(Number),
				// eslint-disable-next-line no-sparse-arrays
				border = [' ',,, '┌',, '┐', '─', '┬',, '│', '└', '├', '┘', '┤', '┴', '┼'];
			for (let j = 0; j <= hBorder.length; j++) {
				const bit = (vBorderTop[j]! << 3) + (vBorderBottom[j]! << 0) // eslint-disable-line no-bitwise
					+ (hBorder[j - 1]! << 2) + (hBorder[j]! << 1); // eslint-disable-line no-bitwise
				out += `${border[bit]!}${hBorder[j] ? '─' : ' '}`;
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
abstract class TableToken extends TrBaseToken {
	/** @browser */
	override readonly type = 'table';
	declare childNodes: [SyntaxToken, AttributesToken, ...(TdToken | TrToken)[], SyntaxToken];
	abstract override get children(): [SyntaxToken, AttributesToken, ...(TdToken | TrToken)[], SyntaxToken];
	abstract override get lastChild(): AttributesToken | TdToken | TrToken | SyntaxToken;
	abstract override get lastElementChild(): AttributesToken | TdToken | TrToken | SyntaxToken;

	/**
	 * 表格是否闭合
	 * @browser
	 */
	get closed(): boolean {
		return this.lastChild.type === 'table-syntax';
	}

	set closed(closed) {
		if (closed && !this.closed) {
			this.close(this.closest('parameter') ? '\n{{!)}}' : '\n|}');
		}
	}

	/**
	 * @browser
	 * @param syntax 表格语法
	 * @param attr 表格属性
	 */
	constructor(syntax: string, attr = '', config = Parser.getConfig(), accum: Token[] = []) {
		super(/^(?:\{\||\{\{\{\s*!\s*\}\}|\{\{\s*\(!\s*\}\})$/u, syntax, attr, config, accum, {
			Token: 2, SyntaxToken: [0, -1], AttributesToken: 1, TdToken: '2:', TrToken: '2:',
		});
	}

	/**
	 * @override
	 * @browser
	 */
	override lint(start = this.getAbsoluteIndex()): Parser.LintError[] {
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
	 * @browser
	 * @param syntax 表格结尾语法
	 * @throws `SyntaxError` 表格的闭合部分不符合语法
	 */
	close(syntax = '\n|}', halfParsed = false): void {
		const isHalfParsed = halfParsed && Parser.running,
			config = this.getAttribute('config'),
			accum = this.getAttribute('accum'),
			inner = !isHalfParsed && Parser.parse(syntax, this.getAttribute('include'), 2, config),
			{lastChild} = this;
		if (inner && !closingPattern.test(inner.text())) {
			throw new SyntaxError(`表格的闭合部分不符合语法：${noWrap(syntax)}`);
		} else if (lastChild instanceof SyntaxToken) {
			lastChild.replaceChildren(...(inner as Token).childNodes);
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
	 * @param token 待插入的子节点
	 * @param i 插入位置
	 * @throws `SyntaxError` 表格的闭合部分非法
	 */
	override insertAt<T extends Token>(token: T, i = this.length): T {
		const previous = this.childNodes.at(i - 1);
		if (typeof token !== 'string' && token.type === 'td' && previous?.type === 'tr') {
			Parser.warn('改为将单元格插入当前行。');
			return previous.insertAt(token);
		} else if (i > 0 && i === this.length && token instanceof SyntaxToken
			&& (token.getAttribute('pattern') !== closingPattern || !closingPattern.test(token.text()))
		) {
			throw new SyntaxError(`表格的闭合部分不符合语法：${noWrap(String(token))}`);
		}
		return super.insertAt(token, i);
	}

	/** @override */
	override getRowCount(): number {
		return super.getRowCount() + this.childNodes.filter(child => child.type === 'tr' && child.getRowCount()).length;
	}

	/** 获取下一行 */
	getNextRow(): TrBaseToken | undefined {
		return this.getNthRow(super.getRowCount() ? 1 : 0, false, false);
	}

	/**
	 * 获取第n行
	 * @param n 行号
	 * @param force 是否将表格自身视为第一行
	 * @param insert 是否用于判断插入新行的位置
	 * @throws `RangeError` 不存在该行
	 */
	getNthRow(n: number, force?: boolean, insert?: false): TrBaseToken | undefined;
	/** @ignore */
	getNthRow(n: number, force: boolean, insert: true): TrBaseToken | SyntaxToken | undefined;
	/** @ignore */
	getNthRow(n: number, force = false, insert = false): TrBaseToken | SyntaxToken | undefined {
		if (!Number.isInteger(n)) {
			this.typeError('getNthRow', 'Number');
		}
		const nRows = this.getRowCount(),
			isRow = super.getRowCount();
		let m = n < 0 ? n + nRows : n;
		if (m === 0 && (isRow || force && nRows === 0)) {
			return this;
		} else if (m < 0 || m > nRows || m === nRows && !insert) {
			throw new RangeError(`不存在第 ${m} 行！`);
		} else if (isRow) {
			m--;
		}
		for (const child of this.childNodes.slice(2)) {
			if (child.type === 'tr' && child.getRowCount()) {
				m--;
				if (m < 0) {
					return child;
				}
			} else if (child.type === 'table-syntax') {
				return child;
			}
		}
		return undefined;
	}

	/** 获取所有行 */
	getAllRows(): TrBaseToken[] {
		const {childNodes: [, ...childNodes]} = this;
		return [
			...super.getRowCount() ? [this] : [],
			...childNodes.filter(child => child.type === 'tr' && child.getRowCount()) as TrToken[],
		];
	}

	/**
	 * 获取指定坐标的单元格
	 * @param coords 表格坐标
	 */
	getNthCell(coords: TableCoords | TableRenderedCoords): TdToken | undefined {
		const rawCoords = coords.row === undefined ? this.toRawCoords(coords) : coords;
		return rawCoords && this.getNthRow(rawCoords.row, false, false)?.getNthCol(rawCoords.column);
	}

	/**
	 * 获取表格布局
	 * @param stop 中止条件
	 * @param stop.row 中止行
	 * @param stop.column 中止列
	 * @param stop.x 中止行
	 * @param stop.y 中止列
	 */
	getLayout(stop?: {row?: number, column?: number, x?: number, y?: number}): Layout {
		const rows = this.getAllRows(),
			{length} = rows,
			layout = new Layout(...new Array(length).fill(undefined).map(() => []));
		for (let i = 0; i < length; i++) {
			if (i > (stop?.row ?? stop?.y ?? NaN)) {
				break;
			}
			const rowLayout = layout[i]!;
			let j = 0,
				k = 0,
				last: boolean | undefined;
			for (const cell of rows[i]!.childNodes.slice(2)) {
				if (cell instanceof TdToken) {
					if (cell.isIndependent()) {
						last = cell.subtype !== 'caption';
					}
					if (last) {
						const coords: TableCoords = {row: i, column: j},
							{rowspan, colspan} = cell;
						j++;
						while (rowLayout[k]) {
							k++;
						}
						if (i === stop?.row && j > (stop.column ?? NaN)) {
							layout[i]![k] = coords;
							return layout;
						}
						for (let y = i; y < Math.min(i + rowspan, length); y++) {
							for (let x = k; x < k + colspan; x++) {
								layout[y]![x] = coords;
							}
						}
						k += colspan;
						if (i === stop?.y && k > (stop.x ?? NaN)) {
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

	/** 打印表格布局 */
	printLayout(): void {
		this.getLayout().print();
	}

	/**
	 * 转换为渲染后的表格坐标
	 * @param {TableCoords} coord wikitext中的表格坐标
	 */
	toRenderedCoords({row, column}: TableCoords): TableRenderedCoords | undefined {
		if (!Number.isInteger(row) || !Number.isInteger(column)) {
			this.typeError('toRenderedCoords', 'Number');
		}
		const rowLayout = this.getLayout({row, column})[row],
			x = rowLayout?.findIndex(coords => cmpCoords(coords, {row, column}) === 0);
		return rowLayout && (x === -1 ? undefined : {y: row, x: x!});
	}

	/**
	 * 转换为wikitext中的表格坐标
	 * @param {TableRenderedCoords} coord 渲染后的表格坐标
	 */
	toRawCoords({x, y}: TableRenderedCoords): TableCoords | undefined {
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

	/**
	 * 获取完整行
	 * @param y 行号
	 */
	getFullRow(y: number): Map<TdToken, boolean> {
		if (!Number.isInteger(y)) {
			this.typeError('getFullRow', 'Number');
		}
		const rows = this.getAllRows();
		return new Map(this.getLayout({y})[y]?.map(({row, column}) => [rows[row]!.getNthCol(column)!, row === y]));
	}

	/**
	 * 获取完整列
	 * @param x 列号
	 */
	getFullCol(x: number): Map<TdToken, boolean> {
		if (!Number.isInteger(x)) {
			this.typeError('getFullCol', 'Number');
		}
		const layout = this.getLayout(),
			colLayout = layout.map(row => row[x]).filter(Boolean) as TableCoords[],
			rows = this.getAllRows();
		return new Map(colLayout.map(
			coords => [rows[coords.row]!.getNthCol(coords.column)!, layout[coords.row]![x - 1] !== coords],
		));
	}

	/**
	 * 设置行格式
	 * @param y 行号
	 * @param attr 表格属性
	 * @param multiRow 是否对所有单元格设置，或是仅对行首单元格设置
	 */
	formatTableRow(y: number, attr: TdAttrs | string = {}, multiRow = false): void {
		format(this.getFullRow(y), attr, multiRow);
	}

	/**
	 * 设置列格式
	 * @param x 列号
	 * @param attr 表格属性
	 * @param multiCol 是否对所有单元格设置，或是仅对行首单元格设置
	 */
	formatTableCol(x: number, attr: TdAttrs | string = {}, multiCol = false): void {
		format(this.getFullCol(x), attr, multiCol);
	}

	/**
	 * 填补表格行
	 * @param y 行号
	 * @param inner 填充内容
	 * @param subtype 单元格类型
	 * @param attr 表格属性
	 */
	fillTableRow(y: number, inner: string | Token, subtype: 'td' | 'th' | 'caption' = 'td', attr: TdAttrs = {}): void {
		const rowToken = this.getNthRow(y)!,
			layout = this.getLayout({y}),
			maxCol = Math.max(...layout.map(({length}) => length)),
			token = TdToken.create(inner, subtype, attr, this.getAttribute('include'), this.getAttribute('config'));
		fill(y, rowToken, layout, maxCol, token);
	}

	/**
	 * 填补表格
	 * @param inner 填充内容
	 * @param subtype 单元格类型
	 * @param attr 表格属性
	 */
	fillTable(inner: string | Token, subtype: 'td' | 'th' | 'caption' = 'td', attr: TdAttrs = {}): void {
		const rowTokens = this.getAllRows(),
			layout = this.getLayout(),
			maxCol = Math.max(...layout.map(({length}) => length)),
			token = TdToken.create(inner, subtype, attr, this.getAttribute('include'), this.getAttribute('config'));
		for (let y = 0; y < rowTokens.length; y++) {
			fill(y, rowTokens[y]!, layout, maxCol, token);
		}
	}

	/**
	 * @override
	 * @param inner 单元格内部wikitext
	 * @param coords 单元格坐标
	 * @param subtype 单元格类型
	 * @param attr 单元格属性
	 * @throws `RangeError` 指定的坐标不是单元格起始点
	 */
	override insertTableCell(
		inner: string | Token,
		coords: TableCoords | TableRenderedCoords,
		subtype: 'td' | 'th' | 'caption' = 'td',
		attr: TdAttrs = {},
	): TdToken {
		let rawCoords: TableCoords | undefined;
		if (coords.column === undefined) {
			const {x, y} = coords;
			rawCoords = this.toRawCoords(coords);
			if (!rawCoords?.start) {
				throw new RangeError(`指定的坐标不是单元格起始点：(${x}, ${y})`);
			}
		} else {
			rawCoords = coords;
		}
		const rowToken = this.getNthRow(rawCoords.row, true);
		return rowToken === this
			? super.insertTableCell(inner, rawCoords, subtype, attr)
			: rowToken!.insertTableCell(inner, rawCoords, subtype, attr);
	}

	/** 在开头插入一行 */
	#prependTableRow(): TrToken {
		// @ts-expect-error abstract class
		const row: TrToken = Parser.run(() => new TrToken('\n|-', undefined, this.getAttribute('config'))),
			{childNodes} = this,
			[,, plain] = childNodes,
			// eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
			start = plain?.constructor === Token ? 3 : 2,
			tdChildren = childNodes.slice(start) as [...TdToken[], SyntaxToken],
			index = tdChildren.findIndex(({type}) => type !== 'td');
		this.insertAt(row, index === -1 ? -1 : index + start);
		Parser.run(() => {
			for (const cell of tdChildren.slice(0, index === -1 ? undefined : index) as TdToken[]) {
				if (cell.subtype !== 'caption') {
					row.insertAt(cell);
				}
			}
		});
		return row;
	}

	/**
	 * 插入表格行
	 * @param y 行号
	 * @param attr 表格行属性
	 * @param inner 内部wikitext
	 * @param subtype 单元格类型
	 * @param innerAttr 单元格属性
	 */
	insertTableRow(
		y: number,
		attr: Record<string, string | true> = {},
		inner: string | Token | undefined = undefined,
		subtype: 'td' | 'th' | 'caption' = 'td',
		innerAttr: TdAttrs = {},
	): TrToken {
		if (!isPlainObject(attr)) {
			this.typeError('insertTableRow', 'Object');
		}
		let reference = this.getNthRow(y, false, true);
		// @ts-expect-error abstract class
		const token: TrToken = Parser.run(() => new TrToken('\n|-', undefined, this.getAttribute('config')));
		for (const [k, v] of Object.entries(attr)) {
			token.setAttr(k, v);
		}
		if (reference?.type === 'table') { // `row === 0`且表格自身是有效行
			reference = this.#prependTableRow();
		}
		this.insertBefore(token, reference);
		if (inner !== undefined) {
			const td = token.insertTableCell(inner, {row: 0, column: 0}, subtype, innerAttr),
				set = new WeakSet<TableCoords>(),
				layout = this.getLayout({y}),
				maxCol = Math.max(...layout.map(({length}) => length)),
				rowLayout = layout[y]!;
			Parser.run(() => {
				for (let i = 0; i < maxCol; i++) {
					const coords = rowLayout[i];
					if (!coords) {
						token.insertAt(td.cloneNode());
					} else if (!set.has(coords)) {
						set.add(coords);
						if (coords.row < y) {
							this.getNthCell(coords)!.rowspan++;
						}
					}
				}
			});
		}
		return token;
	}

	/**
	 * 插入表格列
	 * @param x 列号
	 * @param inner 内部wikitext
	 * @param subtype 单元格类型
	 * @param attr 单元格属性
	 * @throws `RangeError` 列号过大
	 */
	insertTableCol(
		x: number,
		inner: string | Token,
		subtype: 'td' | 'th' | 'caption' = 'td',
		attr: TdAttrs = {},
	): void {
		if (!Number.isInteger(x)) {
			this.typeError('insertTableCol', 'Number');
		}
		const layout = this.getLayout(),
			rowLength = layout.map(({length}) => length),
			minCol = Math.min(...rowLength);
		if (x > minCol) {
			throw new RangeError(`表格第 ${rowLength.indexOf(minCol)} 行仅有 ${minCol} 列！`);
		}
		const token = TdToken.create(inner, subtype, attr, this.getAttribute('include'), this.getAttribute('config'));
		for (let i = 0; i < layout.length; i++) {
			const coords = layout[i]![x],
				prevCoords = x === 0 ? true : layout[i]![x - 1];
			if (!prevCoords) {
				continue;
			} else if (prevCoords !== coords) {
				const rowToken = this.getNthRow(i)!;
				rowToken.insertBefore(token.cloneNode(), rowToken.getNthCol(coords!.column, true));
			} else if (coords.row === i) {
				this.getNthCell(coords)!.colspan++;
			}
		}
	}

	/**
	 * 移除表格行
	 * @param y 行号
	 */
	removeTableRow(y: number): TrToken {
		const rows = this.getAllRows(),
			layout = this.getLayout(),
			rowLayout = layout[y]!,
			set = new WeakSet<TableCoords>();
		for (let x = rowLayout.length - 1; x >= 0; x--) {
			const coords = rowLayout[x]!;
			if (set.has(coords)) {
				continue;
			}
			set.add(coords);
			const token = rows[coords.row]!.getNthCol(coords.column)!;
			let {rowspan} = token;
			if (rowspan > 1) {
				token.rowspan = --rowspan;
				if (coords.row === y) {
					const {colspan, subtype} = token,
						attr = token.getAttrs();
					for (let i = y + 1; rowspan && i < rows.length; i++, rowspan--) {
						const {column} = layout[i]!.slice(x + colspan).find(({row}) => row === i) ?? {};
						if (column !== undefined) {
							rows[i]!.insertTableCell('', {row: 0, column}, subtype, {...attr, rowspan} as TdAttrs);
							break;
						}
					}
				}
			}
		}
		const rowToken = rows[y]!.type === 'table' ? this.#prependTableRow() : rows[y] as TrToken;
		rowToken.remove();
		return rowToken;
	}

	/**
	 * 移除表格列
	 * @param x 列号
	 */
	removeTableCol(x: number): void {
		for (const [token, start] of this.getFullCol(x)) {
			const {colspan, lastChild} = token;
			if (colspan > 1) {
				token.colspan = colspan - 1;
				if (start) {
					lastChild.replaceChildren();
				}
			} else {
				token.remove();
			}
		}
	}

	/**
	 * 合并单元格
	 * @param xlim 列范围
	 * @param ylim 行范围
	 * @throws `RangeError` 待合并区域与外侧区域有重叠
	 */
	mergeCells(xlim: [number, number], ylim: [number, number]): TdToken {
		if (![...xlim, ...ylim].every(Number.isInteger)) {
			this.typeError('mergeCells', 'Number');
		}
		const layout = this.getLayout(),
			maxCol = Math.max(...layout.map(({length}) => length)),
			posXlim = xlim.map(x => x < 0 ? x + maxCol : x) as [number, number],
			posYlim = ylim.map(y => y < 0 ? y + layout.length : y) as [number, number],
			[xmin, xmax] = posXlim.sort(),
			[ymin, ymax] = posYlim.sort(),
			set = new Set<TableCoords | undefined>(
				layout.slice(ymin, ymax).flatMap(rowLayout => rowLayout.slice(xmin, xmax)),
			);
		if ([...layout[ymin - 1] ?? [], ...layout[ymax] ?? []].some(coords => set.has(coords))
			|| layout.some(rowLayout => set.has(rowLayout[xmin - 1]) || set.has(rowLayout[xmax]))
		) {
			throw new RangeError('待合并区域与外侧区域有重叠！');
		}
		const corner = layout[ymin]![xmin]!,
			rows = this.getAllRows(),
			cornerCell = rows[corner.row]!.getNthCol(corner.column)!;
		cornerCell.rowspan = ymax - ymin;
		cornerCell.colspan = xmax - xmin;
		set.delete(corner);
		for (const token of ([...set] as TableCoords[]).map(({row, column}) => rows[row]!.getNthCol(column)!)) {
			token.remove();
		}
		return cornerCell;
	}

	/**
	 * 分裂单元格
	 * @param coords 单元格坐标
	 * @param dirs 分裂方向
	 * @throws `RangeError` 指定的坐标不是单元格起始点
	 */
	#split(coords: TableCoords | TableRenderedCoords, dirs: Set<'rowspan' | 'colspan'>): void {
		const cell = this.getNthCell(coords)!,
			attr = cell.getAttrs(),
			{subtype} = cell;
		attr.rowspan ||= 1;
		attr.colspan ||= 1;
		for (const dir of dirs) {
			if (attr[dir] === 1) {
				dirs.delete(dir);
			}
		}
		if (dirs.size === 0) {
			return;
		}
		let {x, y} = coords;
		const rawCoords = x === undefined ? coords as TableCoords : this.toRawCoords(coords as TableRenderedCoords)!;
		if (rawCoords.start === false || x === undefined) {
			({x, y} = this.toRenderedCoords(rawCoords)!);
		}
		const splitting = {rowspan: 1, colspan: 1};
		for (const dir of dirs) {
			cell.setAttr(dir, 1);
			splitting[dir] = attr[dir]!;
			delete attr[dir];
		}
		for (let j = y!; j < y! + splitting.rowspan; j++) {
			for (let i = x; i < x + splitting.colspan; i++) {
				if (i > x || j > y!) {
					try {
						this.insertTableCell('', {x: i, y: j}, subtype, attr);
					} catch (e) {
						if (e instanceof RangeError && e.message.startsWith('指定的坐标不是单元格起始点：')) {
							break;
						}
						throw e;
					}
				}
			}
		}
	}

	/**
	 * 分裂成多行
	 * @param coords 单元格坐标
	 */
	splitIntoRows(coords: TableCoords | TableRenderedCoords): void {
		this.#split(coords, new Set(['rowspan']));
	}

	/**
	 * 分裂成多列
	 * @param coords 单元格坐标
	 */
	splitIntoCols(coords: TableCoords | TableRenderedCoords): void {
		this.#split(coords, new Set(['colspan']));
	}

	/**
	 * 分裂成单元格
	 * @param coords 单元格坐标
	 */
	splitIntoCells(coords: TableCoords | TableRenderedCoords): void {
		this.#split(coords, new Set(['rowspan', 'colspan']));
	}

	/**
	 * 复制一行并插入该行之前
	 * @param row 行号
	 */
	replicateTableRow(row: number): TrToken {
		let rowToken = this.getNthRow(row)!;
		if (rowToken.type === 'table') {
			rowToken = this.#prependTableRow();
		}
		const replicated = this.insertBefore((rowToken as TrToken).cloneNode(), rowToken);
		for (const [token, start] of this.getFullRow(row)) {
			if (start) {
				token.rowspan = 1;
			} else {
				token.rowspan++;
			}
		}
		return replicated;
	}

	/**
	 * 复制一列并插入该列之前
	 * @param x 列号
	 */
	replicateTableCol(x: number): TdToken[] {
		const replicated: TdToken[] = [];
		for (const [token, start] of this.getFullCol(x)) {
			if (start) {
				const newToken = token.cloneNode();
				newToken.colspan = 1;
				token.before(newToken);
				replicated.push(newToken);
			} else {
				token.colspan++;
			}
		}
		return replicated;
	}

	/**
	 * 移动表格行
	 * @param y 行号
	 * @param before 新位置
	 * @throws `RangeError` 无法移动
	 */
	moveTableRowBefore(y: number, before: number): TrToken {
		if (!Number.isInteger(y) || !Number.isInteger(before)) {
			this.typeError('moveTableRowBefore', 'Number');
		}
		const layout = this.getLayout(),
			/** @ignore */
			occupied = (i: number): number[] =>
				layout[i]!.map(({row}, j) => row === i ? j : undefined).filter(j => j !== undefined) as number[];
		try {
			assert.deepStrictEqual(occupied(y), occupied(before));
		} catch (e) {
			if (e instanceof assert.AssertionError) {
				throw new RangeError(`第 ${y} 行与第 ${before} 行的构造不同，无法移动！`);
			}
			throw e;
		}
		const rowToken = this.removeTableRow(y);
		for (const coords of layout[before]!) {
			if (coords.row < before) {
				this.getNthCell(coords)!.rowspan++;
			}
		}
		let beforeToken = this.getNthRow(before)!;
		if (beforeToken.type === 'table') {
			beforeToken = this.#prependTableRow();
		}
		this.insertBefore(rowToken, beforeToken);
		return rowToken;
	}

	/**
	 * 移动表格行
	 * @param y 行号
	 * @param after 新位置
	 * @throws `RangeError` 无法移动
	 */
	moveTableRowAfter(y: number, after: number): TrToken {
		if (!Number.isInteger(y) || !Number.isInteger(after)) {
			this.typeError('moveTableRowAfter', 'Number');
		}
		const layout = this.getLayout(),
			afterToken = this.getNthRow(after)!,
			cells = afterToken.childNodes.filter(
				child => child instanceof TdToken && child.subtype !== 'caption',
			) as TdToken[],
			/** @ignore */
			occupied = (i: number, oneRow = false): number[] => layout[i]!.map(
				({row, column}, j) => row === i && (!oneRow || cells[column]!.rowspan === 1) ? j : undefined,
			).filter(j => j !== undefined) as number[];
		try {
			assert.deepStrictEqual(occupied(y), occupied(after, true));
		} catch (e) {
			if (e instanceof assert.AssertionError) {
				throw new RangeError(`第 ${y} 行与第 ${after} 行的构造不同，无法移动！`);
			}
			throw e;
		}
		const rowToken = this.removeTableRow(y);
		for (const coords of layout[after]!) {
			if (coords.row < after) {
				this.getNthCell(coords)!.rowspan++;
			} else {
				const cell = cells[coords.column]!,
					{rowspan} = cell;
				if (rowspan > 1) {
					cell.rowspan = rowspan + 1;
				}
			}
		}
		if (afterToken === this) {
			const index = this.childNodes.slice(2).findIndex(isRowEnd);
			this.insertAt(rowToken, index + 2);
		} else {
			this.insertBefore(rowToken, afterToken);
		}
		return rowToken;
	}

	/**
	 * 移动表格列
	 * @param x 列号
	 * @param reference 新位置
	 * @param after 在新位置之后或之前
	 * @throws `RangeError` 无法移动
	 */
	#moveCol(x: number, reference: number, after = false): void {
		if (!Number.isInteger(x) || !Number.isInteger(reference)) {
			this.typeError(`moveTableCol${after ? 'After' : 'Before'}`, 'Number');
		}
		const layout = this.getLayout();
		if (layout.some(rowLayout => isStartCol(rowLayout, x) !== isStartCol(rowLayout, reference, after))) {
			throw new RangeError(`第 ${x} 列与第 ${reference} 列的构造不同，无法移动！`);
		}
		const setX = new WeakSet<TableCoords>(),
			setRef = new WeakSet<TableCoords>(),
			rows = this.getAllRows();
		for (let i = 0; i < layout.length; i++) {
			const rowLayout = layout[i]!,
				coords = rowLayout[x],
				refCoords = rowLayout[reference],
				start = isStartCol(rowLayout, x);
			if (refCoords && !start && !setRef.has(refCoords)) {
				setRef.add(refCoords);
				rows[refCoords.row]!.getNthCol(refCoords.column)!.colspan++;
			}
			if (coords && !setX.has(coords)) {
				setX.add(coords);
				const rowToken = rows[i]!;
				let token = rowToken.getNthCol(coords.column)!;
				const {colspan} = token;
				if (colspan > 1) {
					token.colspan = colspan - 1;
					if (start) {
						const original = token;
						token = token.cloneNode();
						original.lastChild.replaceChildren();
						token.colspan = 1;
					}
				}
				if (start) {
					const col = rowLayout.slice(reference + Number(after)).find(({row}) => row === i)?.column;
					rowToken.insertBefore(
						token,
						col === undefined ? rowToken.childNodes.slice(2).find(isRowEnd) : rowToken.getNthCol(col),
					);
				}
			}
		}
	}

	/**
	 * 移动表格列
	 * @param x 列号
	 * @param before 新位置
	 */
	moveTableColBefore(x: number, before: number): void {
		this.#moveCol(x, before);
	}

	/**
	 * 移动表格列
	 * @param x 列号
	 * @param after 新位置
	 */
	moveTableColAfter(x: number, after: number): void {
		this.#moveCol(x, after, true);
	}
}

Parser.classes['TableToken'] = __filename;
export = TableToken;
