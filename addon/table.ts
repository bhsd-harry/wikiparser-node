import * as assert from 'assert/strict';
import {Shadow} from '../util/debug';
import {classes} from '../util/constants';
import {Token} from '../src';
import {TrToken} from '../src/table/tr';
import {TableToken} from '../src/table';
import {TdToken, createTd} from '../src/table/td';
import type {SyntaxToken} from '../internal';
import {TrBaseToken} from '../src/table/trBase';
import type {TableCoords} from '../src/table/trBase';
import type {TableRenderedCoords} from '../src/table';
import type {TdAttrs, TdSubtypes} from '../src/table/td';

declare interface ExtendedTableToken extends TableToken {
	prependTableRow(): TrToken;
	split(coords: TableCoords | TableRenderedCoords, dirs: Set<'rowspan' | 'colspan'>): void;
	moveCol(x: number, reference: number, after?: boolean): void;
}

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
	Shadow.run(() => {
		for (let i = 0; i < maxCol; i++) {
			if (!rowLayout[i]) {
				rowToken.insertAt(token.cloneNode(), pos);
			}
		}
	});
};

/** @extends {Array<TableCoords[]>} */
export class Layout extends Array<TableCoords[]> {
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
				const bit = (vBorderTop[j]! << 3) + (vBorderBottom[j]! << 0)
					+ (hBorder[j - 1]! << 2) + (hBorder[j]! << 1);
				out += `${border[bit]!}${hBorder[j] ? '─' : ' '}`;
			}
			out += '\n';
		}
		console.log(out.slice(0, -1));
	}
}

Object.assign(TableToken.prototype, {
	/** @implements */
	getNthCell(this: TableToken, coords: TableCoords | TableRenderedCoords): TdToken | undefined {
		const rawCoords = coords.row === undefined ? this.toRawCoords(coords) : coords;
		return rawCoords && this.getNthRow(rawCoords.row, false, false)?.getNthCol(rawCoords.column);
	},

	/** @implements */
	getLayout(this: TableToken, stop?: {row?: number, column?: number, x?: number, y?: number}): Layout {
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
	},

	/** @implements */
	printLayout(this: TableToken): void {
		this.getLayout().print();
	},

	/** @implements */
	toRenderedCoords(this: TableToken, {row, column}: TableCoords): TableRenderedCoords | undefined {
		const rowLayout = this.getLayout({row, column})[row],
			x = rowLayout?.findIndex(coords => cmpCoords(coords, {row, column}) === 0);
		return rowLayout && (x === -1 ? undefined : {y: row, x: x!});
	},

	/** @implements */
	toRawCoords(this: TableToken, {x, y}: TableRenderedCoords): TableCoords | undefined {
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
	},

	/** @implements */
	getFullRow(this: TableToken, y: number): Map<TdToken, boolean> {
		const rows = this.getAllRows();
		return new Map(this.getLayout({y})[y]?.map(({row, column}) => [rows[row]!.getNthCol(column)!, row === y]));
	},

	/** @implements */
	getFullCol(this: TableToken, x: number): Map<TdToken, boolean> {
		const layout = this.getLayout(),
			colLayout = layout.map(row => row[x]).filter(Boolean) as TableCoords[],
			rows = this.getAllRows();
		return new Map(colLayout.map(
			coords => [rows[coords.row]!.getNthCol(coords.column)!, layout[coords.row]![x - 1] !== coords],
		));
	},

	/** @implements */
	formatTableRow(this: TableToken, y: number, attr: TdAttrs | string = {}, multiRow = false): void {
		format(this.getFullRow(y), attr, multiRow);
	},

	/** @implements */
	formatTableCol(this: TableToken, x: number, attr: TdAttrs | string = {}, multiCol = false): void {
		format(this.getFullCol(x), attr, multiCol);
	},

	/** @implements */
	fillTableRow(
		this: TableToken,
		y: number,
		inner: string | Token,
		subtype: TdSubtypes = 'td',
		attr: TdAttrs = {},
	): void {
		const rowToken = this.getNthRow(y)!,
			layout = this.getLayout({y}),
			maxCol = Math.max(...layout.map(({length}) => length)),
			token = createTd(inner, subtype, attr, this.getAttribute('include'), this.getAttribute('config'));
		fill(y, rowToken, layout, maxCol, token);
	},

	/** @implements */
	fillTable(this: TableToken, inner: string | Token, subtype: TdSubtypes = 'td', attr: TdAttrs = {}): void {
		const rowTokens = this.getAllRows(),
			layout = this.getLayout(),
			maxCol = Math.max(...layout.map(({length}) => length)),
			token = createTd(inner, subtype, attr, this.getAttribute('include'), this.getAttribute('config'));
		for (let y = 0; y < rowTokens.length; y++) {
			fill(y, rowTokens[y]!, layout, maxCol, token);
		}
	},

	/** @implements */
	insertTableCell(
		this: TableToken,
		inner: string | Token,
		coords: TableCoords | TableRenderedCoords,
		subtype: TdSubtypes = 'td',
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
			? TrBaseToken.prototype.insertTableCell.call(this, inner, rawCoords, subtype, attr)
			: rowToken!.insertTableCell(inner, rawCoords, subtype, attr);
	},

	/** @implements */
	prependTableRow(this: TableToken): TrToken {
		const row = Shadow.run(() => new TrToken('\n|-', undefined, this.getAttribute('config'))),
			{childNodes} = this,
			[,, plain] = childNodes,
			start = plain?.constructor === Token ? 3 : 2,
			tdChildren = childNodes.slice(start) as [...TdToken[], SyntaxToken] | TdToken[],
			index = tdChildren.findIndex(({type}) => type !== 'td');
		this.insertAt(row, index === -1 ? -1 : index + start);
		Shadow.run(() => {
			for (const cell of tdChildren.slice(0, index === -1 ? undefined : index) as TdToken[]) {
				if (cell.subtype !== 'caption') {
					row.insertAt(cell);
				}
			}
		});
		return row;
	},

	/** @implements */
	insertTableRow(
		this: ExtendedTableToken,
		y: number,
		attr: Record<string, string | true> = {},
		inner?: string | Token,
		subtype: TdSubtypes = 'td',
		innerAttr: TdAttrs = {},
	): TrToken {
		let reference = this.getNthRow(y, false, true);
		const token = Shadow.run(() => new TrToken('\n|-', undefined, this.getAttribute('config')));
		for (const [k, v] of Object.entries(attr)) {
			token.setAttr(k, v);
		}
		if (reference?.type === 'table') { // `row === 0`且表格自身是有效行
			reference = this.prependTableRow();
		}
		this.insertBefore(token, reference);
		if (inner !== undefined) {
			const td = token.insertTableCell(inner, {row: 0, column: 0}, subtype, innerAttr),
				set = new WeakSet<TableCoords>(),
				layout = this.getLayout({y}),
				maxCol = Math.max(...layout.map(({length}) => length)),
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
	},

	/** @implements */
	insertTableCol(
		this: TableToken,
		x: number,
		inner: string | Token,
		subtype: TdSubtypes = 'td',
		attr: TdAttrs = {},
	): void {
		const layout = this.getLayout(),
			rowLength = layout.map(({length}) => length),
			minCol = Math.min(...rowLength);
		if (x > minCol) {
			throw new RangeError(`表格第 ${rowLength.indexOf(minCol)} 行仅有 ${minCol} 列！`);
		}
		const token = createTd(inner, subtype, attr, this.getAttribute('include'), this.getAttribute('config'));
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
	},

	/** @implements */
	removeTableRow(this: ExtendedTableToken, y: number): TrToken {
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
		const rowToken = rows[y]!.type === 'table' ? this.prependTableRow() : rows[y] as TrToken;
		rowToken.remove();
		return rowToken;
	},

	/** @implements */
	removeTableCol(this: TableToken, x: number): void {
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
	},

	/** @implements */
	mergeCells(this: TableToken, xlim: [number, number], ylim: [number, number]): TdToken {
		const layout = this.getLayout(),
			maxCol = Math.max(...layout.map(({length}) => length)),
			posXlim = xlim.map(x => x < 0 ? x + maxCol : x) as [number, number],
			posYlim = ylim.map(y => y < 0 ? y + layout.length : y) as [number, number],
			[xmin, xmax] = posXlim.sort(),
			[ymin, ymax] = posYlim.sort(),
			set = new Set(layout.slice(ymin, ymax).flatMap(rowLayout => rowLayout.slice(xmin, xmax)));
		if ([...layout[ymin - 1] ?? [], ...layout[ymax] ?? []].some(coords => set.has(coords))
			|| layout.some(rowLayout => set.has(rowLayout[xmin - 1]!) || set.has(rowLayout[xmax]!))
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
	},

	/** @implements */
	split(this: TableToken, coords: TableCoords | TableRenderedCoords, dirs: Set<'rowspan' | 'colspan'>): void {
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
	},

	/** @implements */
	splitIntoRows(this: ExtendedTableToken, coords: TableCoords | TableRenderedCoords): void {
		this.split(coords, new Set(['rowspan']));
	},

	/** @implements */
	splitIntoCols(this: ExtendedTableToken, coords: TableCoords | TableRenderedCoords): void {
		this.split(coords, new Set(['colspan']));
	},

	/** @implements */
	splitIntoCells(this: ExtendedTableToken, coords: TableCoords | TableRenderedCoords): void {
		this.split(coords, new Set(['rowspan', 'colspan']));
	},

	/** @implements */
	replicateTableRow(this: ExtendedTableToken, row: number): TrToken {
		let rowToken = this.getNthRow(row)!;
		if (rowToken.type === 'table') {
			rowToken = this.prependTableRow();
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
	},

	/** @implements */
	replicateTableCol(this: TableToken, x: number): TdToken[] {
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
	},

	/** @implements */
	moveTableRowBefore(this: ExtendedTableToken, y: number, before: number): TrToken {
		const layout = this.getLayout(),
			/** @ignore */
			occupied = (i: number): number[] =>
				layout[i]!.map(({row}, j) => row === i ? j : undefined).filter(j => j !== undefined) as number[];
		try {
			assert.deepEqual(occupied(y), occupied(before));
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
			beforeToken = this.prependTableRow();
		}
		this.insertBefore(rowToken, beforeToken);
		return rowToken;
	},

	/** @implements */
	moveTableRowAfter(this: TableToken, y: number, after: number): TrToken {
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
			assert.deepEqual(occupied(y), occupied(after, true));
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
	},

	/** @implements */
	moveCol(this: TableToken, x: number, reference: number, after = false): void {
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
	},

	/** @implements */
	moveTableColBefore(this: ExtendedTableToken, x: number, before: number): void {
		this.moveCol(x, before);
	},

	/** @implements */
	moveTableColAfter(this: ExtendedTableToken, x: number, after: number): void {
		this.moveCol(x, after, true);
	},
});

classes['ExtendTableToken'] = __filename;
