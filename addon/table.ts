/* eslint @stylistic/operator-linebreak: [2, "before", {overrides: {"=": "after"}}] */

import assert from 'assert/strict';
import {Shadow, isRowEnd, emptyArray} from '../util/debug';
import {classes} from '../util/constants';
import {Token} from '../src/index';
import {TrToken} from '../src/table/tr';
import {TableToken, Layout} from '../src/table/index';
import {TdToken, createTd} from '../src/table/td';
import {TrBaseToken} from '../src/table/trBase';
import type {SyntaxToken} from '../internal';
import type {TableCoords} from '../src/table/trBase';
import type {TableRenderedCoords} from '../src/table/index';
import type {TdAttrs, TdSpanAttrs, TdSubtypes} from '../src/table/td';

/**
 * 比较两个数
 * @param a
 * @param b
 */
const compare = (a: number, b: number): number => a - b;

/**
 * 检查坐标形式
 * @param coords 坐标
 */
const isTableCoords = (coords: TableCoords | TableRenderedCoords): coords is TableCoords => coords.x === undefined;

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
 * 是否是合并单元格的第一列
 * @param rowLayout 行布局
 * @param i 单元格序号
 * @param oneCol 是否仅有一列
 */
const isStartCol = (rowLayout: readonly TableCoords[], i: number, oneCol?: boolean): boolean => {
	const coords = rowLayout[i];
	return rowLayout[i - 1] !== coords && (!oneCol || rowLayout[i + 1] !== coords);
};

/**
 * 起点位于第`i`行的单元格序号
 * @param layout 表格布局
 * @param i 行号
 * @param oneRow 是否要求单元格跨行数为1
 * @param cells 改行全部单元格
 * @throws `RangeError` 表格布局不包含第`i`行
 */
const occupied = (layout: Layout, i: number, oneRow?: true, cells?: readonly TdToken[]): number[] => {
	const rowLayout = layout[i];
	if (rowLayout) {
		return rowLayout.map(
			({row, column}, j) => row === i && (!oneRow || cells![column]?.rowspan === 1) ? j : undefined,
		).filter((j): j is number => j !== undefined);
	}
	throw new RangeError(`The table layout does not contain row ${i}!`);
};

/**
 * 设置表格格式
 * @param cells 单元格
 * @param attr 属性
 * @param multi 是否对所有单元格设置，或是仅对行首单元格设置
 */
const format = (cells: Map<TdToken, boolean>, attr: TdAttrs | TdSubtypes = {}, multi?: boolean): void => {
	for (const [token, start] of cells) {
		if (multi || start) {
			if (typeof attr === 'string') {
				token.setSyntax(attr);
			} else {
				token.setAttr(attr);
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
		index = rowToken.childNodes.findLastIndex(child => child instanceof TdToken && child.subtype !== 'caption'),
		pos = index > 0 ? index + 1 : undefined;
	Shadow.run(() => {
		for (let i = 0; i < maxCol; i++) {
			if (!rowLayout[i]) {
				rowToken.insertAt(token.cloneNode(), pos);
			}
		}
	});
};

/**
 * 计算最大列数
 * @param layout 表格布局
 */
const getMaxCol = (layout: Layout): number => {
	let maxCol = 0;
	for (const {length} of layout) {
		if (maxCol < length) {
			maxCol = length;
		}
	}
	return maxCol;
};

/**
 * 在表格开头插入一行
 * @param table 表格
 */
const prependTableRow = (table: TableToken): TrToken => {
	// @ts-expect-error abstract class
	const row = Shadow.run((): TrToken => new TrToken('\n|-', undefined, table.getAttribute('config'))),
		{childNodes} = table,
		[,, plain] = childNodes,
		start = plain?.constructor === Token ? 3 : 2,
		tdChildren = childNodes.slice(start) as [...TdToken[], SyntaxToken] | TdToken[],
		index = tdChildren.findIndex(({type}) => type !== 'td');
	table.insertAt(row, index === -1 ? -1 : index + start);
	Shadow.run(() => {
		for (const cell of tdChildren.slice(0, index === -1 ? undefined : index) as TdToken[]) {
			if (cell.subtype !== 'caption') {
				row.insertAt(cell);
			}
		}
	});
	return row;
};

/**
 * 分裂单元格
 * @param table 表格
 * @param coords 单元格坐标
 * @param dirs 分裂方向
 * @throws `RangeError` 指定坐标不是某个单元格的起始点
 */
const split = (table: TableToken, coords: TableCoords | TableRenderedCoords, dirs: Set<keyof TdSpanAttrs>): void => {
	const cell = table.getNthCell(coords)!,
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
	const rawCoords = isTableCoords(coords) ? coords : table.toRawCoords(coords)!;
	if (rawCoords.start === false || x === undefined) {
		({x, y} = table.toRenderedCoords(rawCoords)!);
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
					table.insertTableCell('', {x: i, y: j}, subtype, attr);
				} catch (e) {
					if (
						e instanceof RangeError
						&& e.message.startsWith(
							'The specified coordinates are not the starting point of a cell: ',
						)
					) {
						break;
					}
					throw e;
				}
			}
		}
	}
};

/**
 * 移动表格列
 * @param table 表格
 * @param x 列号
 * @param reference 参考列号
 * @param after 是否插入到参考列之后
 * @throws `RangeError` 两列结构不一致，无法移动
 */
const moveCol = (table: TableToken, x: number, reference: number, after?: boolean): void => {
	const layout = table.getLayout();
	if (layout.some(rowLayout => isStartCol(rowLayout, x) !== isStartCol(rowLayout, reference, after))) {
		throw new RangeError(
			`The structure of column ${x} is different from that of column ${
				reference
			}, so it cannot be moved!`,
		);
	}
	const setX = new WeakSet<TableCoords>(),
		setRef = new WeakSet<TableCoords>(),
		rows = table.getAllRows();
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
					col === undefined
						? rowToken.childNodes.slice(2).find(isRowEnd)
						: rowToken.getNthCol(col),
				);
			}
		}
	}
};

Layout.prototype.print =
	/** @implements */
	function(): void {
		const hBorders = emptyArray(this.length + 1, i => {
				const prev = this[i - 1] ?? [],
					next = this[i] ?? [];
				return emptyArray(Math.max(prev.length, next.length), j => prev[j] !== next[j]);
			}),
			vBorders = this.map(cur => emptyArray(cur.length + 1, j => cur[j - 1] !== cur[j]));
		let out = '';
		for (let i = 0; i <= this.length; i++) {
			const hBorder = hBorders[i]!.map(Number),
				vBorderTop = (vBorders[i - 1] ?? []).map(Number),
				vBorderBottom = (vBorders[i] ?? []).map(Number),
				// eslint-disable-next-line no-sparse-arrays
				border = [' ',,, '┌',, '┐', '─', '┬',, '│', '└', '├', '┘', '┤', '┴', '┼'];
			for (let j = 0; j <= hBorder.length; j++) {
				/* eslint-disable no-bitwise */
				const bit = (vBorderTop[j]! << 3) + (vBorderBottom[j]! << 0)
					+ (hBorder[j - 1]! << 2) + (hBorder[j]! << 1);
				/* eslint-enable no-bitwise */
				out += border[bit]! + (hBorder[j] ? '─' : ' ');
			}
			out += '\n';
		}
		console.log(out.slice(0, -1));
	};

TableToken.prototype.getNthCell =
	/** @implements */
	function(coords: TableCoords | TableRenderedCoords): TdToken | undefined {
		let rawCoords: TableCoords | undefined = coords as TableCoords;
		if (coords.row === undefined) {
			rawCoords = this.toRawCoords(coords);
		}
		return rawCoords && this.getNthRow(rawCoords.row, false, false)?.getNthCol(rawCoords.column);
	};

TableToken.prototype.printLayout =
	/** @implements */
	function(): void {
		this.getLayout().print();
	};

TableToken.prototype.toRenderedCoords =
	/** @implements */
	function({row, column}): TableRenderedCoords | undefined {
		const rowLayout = this.getLayout({row, column})[row],
			x = rowLayout?.findIndex(coords => cmpCoords(coords, {row, column}) === 0);
		return rowLayout && (x === -1 ? undefined : {y: row, x: x!});
	};

TableToken.prototype.toRawCoords =
	/** @implements */
	function({x, y}): TableCoords | undefined {
		const rowLayout = this.getLayout({x, y})[y],
			coords = rowLayout?.[x];
		if (coords) {
			return {
				...coords,
				start: coords.row === y && rowLayout[x - 1] !== coords,
			};
		} else if (rowLayout || y > 0) {
			return x === rowLayout?.length
				? {row: y, column: (rowLayout.findLast(({row}) => row === y)?.column ?? -1) + 1, start: true}
				: undefined;
		}
		return {row: 0, column: 0, start: true};
	};

TableToken.prototype.getFullRow =
	/** @implements */
	function(y): Map<TdToken, boolean> {
		const rows = this.getAllRows();
		return new Map(this.getLayout({y})[y]?.map(({row, column}) => [rows[row]!.getNthCol(column)!, row === y]));
	};

TableToken.prototype.getFullCol =
	/** @implements */
	function(x): Map<TdToken, boolean> {
		const layout = this.getLayout(),
			rows = this.getAllRows();
		return new Map(layout.map(row => row[x]).filter(coords => coords !== undefined).map(
			coords => [rows[coords.row]!.getNthCol(coords.column)!, layout[coords.row]![x - 1] !== coords],
		));
	};

TableToken.prototype.formatTableRow =
	/** @implements */
	function(y, attr, multiRow): void {
		format(this.getFullRow(y), attr, multiRow);
	};

TableToken.prototype.formatTableCol =
	/** @implements */
	function(x, attr, multiCol): void {
		format(this.getFullCol(x), attr, multiCol);
	};

TableToken.prototype.fillTableRow =
	/** @implements */
	function(y, inner, subtype, attr): void {
		const layout = this.getLayout({y});
		fill(y, this.getNthRow(y)!, layout, getMaxCol(layout), createTd(inner, this, subtype, attr));
	};

TableToken.prototype.fillTable =
	/** @implements */
	function(inner, subtype, attr): void {
		const rowTokens = this.getAllRows(),
			layout = this.getLayout(),
			maxCol = getMaxCol(layout),
			token = createTd(inner, this, subtype, attr);
		for (let y = 0; y < rowTokens.length; y++) {
			fill(y, rowTokens[y]!, layout, maxCol, token);
		}
	};

TableToken.prototype.insertTableCell =
	/** @implements */
	function(inner, coords, subtype, attr): TdToken {
		let rawCoords: TableCoords | undefined;
		if (coords.column === undefined) {
			const {x, y} = coords;
			rawCoords = this.toRawCoords(coords);
			if (!rawCoords?.start) {
				throw new RangeError(
					`The specified coordinates are not the starting point of any cell: (${x}, ${y})`,
				);
			}
		} else {
			rawCoords = coords;
		}
		const rowToken = this.getNthRow(rawCoords.row, true);
		return rowToken === this
			? TrBaseToken.prototype.insertTableCell.call(this, inner, rawCoords, subtype, attr)
			: rowToken!.insertTableCell(inner, rawCoords, subtype, attr);
	};

TableToken.prototype.insertTableRow =
	/** @implements */
	function(y, attr = {}, inner?: string | Token, subtype = 'td', innerAttr = {}): TrToken {
		let reference = this.getNthRow(y, false, true);
		// @ts-expect-error abstract class
		const token = Shadow.run((): TrToken => new TrToken('\n|-', undefined, this.getAttribute('config')));
		token.setAttr(attr);
		if (reference?.is<TableToken>('table')) { // `row === 0`且表格自身是有效行
			reference = prependTableRow(this);
		}
		this.insertBefore(token, reference);
		if (inner !== undefined) {
			const td = token.insertTableCell(inner, {row: 0, column: 0}, subtype, innerAttr),
				set = new WeakSet<TableCoords>(),
				layout = this.getLayout({y}),
				maxCol = getMaxCol(layout),
				rowLayout = layout[y]!;
			Shadow.run(() => {
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
	};

TableToken.prototype.insertTableCol =
	/** @implements */
	function(x, inner, subtype, attr): void {
		const layout = this.getLayout(),
			rowLength = layout.map(({length}) => length);
		let minCol = Infinity;
		for (const length of rowLength) {
			if (minCol > length) {
				minCol = length;
			}
		}
		if (x > minCol) {
			throw new RangeError(`Row ${rowLength.indexOf(minCol)} has only ${minCol} column(s)!`);
		}
		const token = createTd(inner, this, subtype, attr);
		for (let i = 0; i < layout.length; i++) {
			const rowLayout = layout[i]!,
				coords = rowLayout[x],
				prevCoords = x === 0 ? true : rowLayout[x - 1];
			if (!prevCoords) {
				continue;
			} else if (prevCoords !== coords) {
				const rowToken = this.getNthRow(i)!;
				rowToken.insertBefore(token.cloneNode(), rowToken.getNthCol(coords!.column, true));
			} else if (coords.row === i) {
				this.getNthCell(coords)!.colspan++;
			}
		}
	};

TableToken.prototype.removeTableRow =
	/** @implements */
	function(y): TrToken {
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
							rows[i]!
								.insertTableCell('', {row: 0, column}, subtype, {...attr, rowspan} as TdAttrs);
							break;
						}
					}
				}
			}
		}
		const row = rows[y]!,
			rowToken = row.is<TrToken>('tr') ? row : prependTableRow(this);
		rowToken.remove();
		return rowToken;
	};

TableToken.prototype.removeTableCol =
	/** @implements */
	function(x): void {
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
	};

TableToken.prototype.mergeCells =
	/** @implements */
	function(xlim, ylim): TdToken {
		const layout = this.getLayout(),
			maxCol = getMaxCol(layout),
			[xmin, xmax] = xlim.map(x => x < 0 ? x + maxCol : x).sort(compare) as [number, number],
			[ymin, ymax] = ylim.map(y => y < 0 ? y + layout.length : y).sort(compare) as [number, number],
			set = new Set(layout.slice(ymin, ymax).flatMap(rowLayout => rowLayout.slice(xmin, xmax)));
		if (
			[...layout[ymin - 1] ?? [], ...layout[ymax] ?? []].some(coords => set.has(coords))
			|| layout.some(rowLayout => set.has(rowLayout[xmin - 1]!) || set.has(rowLayout[xmax]!))
		) {
			throw new RangeError('The area to be merged overlaps with the outer area!');
		}
		const corner = layout[ymin]![xmin]!,
			rows = this.getAllRows(),
			cornerCell = rows[corner.row]!.getNthCol(corner.column)!;
		cornerCell.rowspan = ymax - ymin;
		cornerCell.colspan = xmax - xmin;
		set.delete(corner);
		for (const token of [...set].map(({row, column}) => rows[row]!.getNthCol(column)!)) {
			token.remove();
		}
		return cornerCell;
	};

TableToken.prototype.splitIntoRows =
	/** @implements */
	function(coords): void {
		split(this, coords, new Set(['rowspan']));
	};

TableToken.prototype.splitIntoCols =
	/** @implements */
	function(coords): void {
		split(this, coords, new Set(['colspan']));
	};

TableToken.prototype.splitIntoCells =
	/** @implements */
	function(coords): void {
		split(this, coords, new Set(['rowspan', 'colspan']));
	};

TableToken.prototype.replicateTableRow =
	/** @implements */
	function(row): TrToken {
		let rowToken = this.getNthRow(row)!;
		if (rowToken.is<TableToken>('table')) {
			rowToken = prependTableRow(this);
		}
		const replicated = this.insertBefore(rowToken.cloneNode(), rowToken);
		for (const [token, start] of this.getFullRow(row)) {
			if (start) {
				token.rowspan = 1;
			} else {
				token.rowspan++;
			}
		}
		return replicated;
	};

TableToken.prototype.replicateTableCol =
	/** @implements */
	function(x): TdToken[] {
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
	};

TableToken.prototype.moveTableRowBefore =
	/** @implements */
	function(y, before): TrToken {
		const layout = this.getLayout();
		try {
			assert.deepEqual(occupied(layout, y), occupied(layout, before));
		} catch (e) {
			if (e instanceof assert.AssertionError) {
				throw new RangeError(
					`The structure of row ${y} is different from that of row ${
						before
					}, so it cannot be moved!`,
					{cause: e},
				);
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
		if (beforeToken.is<TableToken>('table')) {
			beforeToken = prependTableRow(this);
		}
		this.insertBefore(rowToken, beforeToken);
		return rowToken;
	};

TableToken.prototype.moveTableRowAfter =
	/** @implements */
	function(y, after): TrToken {
		const layout = this.getLayout(),
			afterToken = this.getNthRow(after)!,
			cells = afterToken.childNodes.filter(
				child => child.is<TdToken>('td') && child.subtype !== 'caption',
			) as TdToken[];
		try {
			assert.deepEqual(occupied(layout, y), occupied(layout, after, true, cells));
		} catch (e) {
			if (e instanceof assert.AssertionError) {
				throw new RangeError(
					`The structure of row ${y} is different from that of row ${
						after
					}, so it cannot be moved!`,
					{cause: e},
				);
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
	};

TableToken.prototype.moveTableColBefore =
	/** @implements */
	function(x, before): void {
		moveCol(this, x, before);
	};

TableToken.prototype.moveTableColAfter =
	/** @implements */
	function(x, after): void {
		moveCol(this, x, after, true);
	};

classes['ExtendedTableToken'] = __filename;
