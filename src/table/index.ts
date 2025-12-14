import {generateForChild} from '../../util/lint';
import {
	Shadow,
	isRowEnd,
	emptyArray,

	/* NOT FOR BROWSER */

	isToken,
} from '../../util/debug';
import {BoundingRect} from '../../lib/rect';
import {cached} from '../../mixin/cached';
import Parser from '../../index';
import {TrBaseToken} from './trBase';
import {SyntaxToken} from '../syntax';
import type {
	Config,
	LintError,
	AST,
} from '../../base';
import type {AttributesToken, TdToken, TrToken, Token} from '../../internal';
import type {TableCoords} from './trBase';

/* NOT FOR BROWSER */

import {html} from '../../util/html';
import {classes} from '../../util/constants';
import {noWrap} from '../../util/string';
import type {TdAttrs, TdSubtypes} from './td';

export interface TableRenderedCoords {
	readonly row?: undefined;
	readonly column?: undefined;
	readonly x: number;
	readonly y: number;
}

const closingPattern = /^\n[^\S\n]*(?:\|\}|\{\{\s*!\s*\}\}\}|\{\{\s*!\)\s*\}\})$/u;

/* NOT FOR BROWSER END */

export type TableTokens = TableToken | TrToken | TdToken;

/** @extends {Array<TableCoords[]>} */
export class Layout extends Array<TableCoords[]> {
	// @ts-expect-error abstract override
	abstract override static from(arr: TableCoords[][]): Layout;

	/* NOT FOR BROWSER */

	/**
	 * Print the table layout
	 *
	 * 打印表格布局
	 */
	print(): void {
		require('../../addon/table');
		this.print();
	}
}

/**
 * table
 *
 * 表格
 * @classdesc `{childNodes: [SyntaxToken, AttributesToken, ?Token, ...TdToken[], ...TrToken[], ?SyntaxToken]}`
 */
export abstract class TableToken extends TrBaseToken {
	declare readonly childNodes: readonly [SyntaxToken, AttributesToken, ...(TdToken | TrToken)[], SyntaxToken]
		| readonly [SyntaxToken, AttributesToken, ...(TdToken | TrToken)[]];
	abstract override get lastChild(): AttributesToken | TdToken | TrToken | SyntaxToken;

	/* NOT FOR BROWSER */

	abstract override get children(): [SyntaxToken, AttributesToken, ...(TdToken | TrToken)[], SyntaxToken]
		| [SyntaxToken, AttributesToken, ...(TdToken | TrToken)[]];
	abstract override get lastElementChild(): AttributesToken | TdToken | TrToken | SyntaxToken;

	/* NOT FOR BROWSER END */

	override get type(): 'table' {
		return 'table';
	}

	/** whether the table is closed / 表格是否闭合 */
	get closed(): boolean {
		LINT: return this.lastChild.is<SyntaxToken>('table-syntax');
	}

	/* NOT FOR BROWSER */

	set closed(closed) {
		if (closed && !this.closed) {
			this.close(this.isInside('parameter') ? '\n{{!}}}' : '\n|}');
		}
	}

	/* NOT FOR BROWSER END */

	/**
	 * @param syntax 表格语法
	 * @param attr 表格属性
	 */
	constructor(syntax?: string, attr?: string, config?: Config, accum?: Token[]) {
		super(/^(?:\{\||\{\{\{\s*!\s*\}\}|\{\{\s*\(!\s*\}\})$/u, syntax, 'table', attr, config, accum, {
			Token: 2, SyntaxToken: [0, -1], AttributesToken: 1, TdToken: '2:', TrToken: '2:',
		});
	}

	/** @private */
	override lint(start = this.getAbsoluteIndex(), re?: RegExp): LintError[] {
		LINT: {
			const errors = super.lint(start, re),
				rect = new BoundingRect(this, start),
				rules = ['unclosed-table', 'table-layout'] as const,
				s = rules.map(rule => Parser.lintConfig.getSeverity(rule));
			if (s[0] && !this.closed) {
				errors.push(generateForChild(this.firstChild, rect, rules[0], 'unclosed-table', s[0]));
			}
			if (s[1]) {
				const layout = this.getLayout(),
					{length} = layout;
				if (length > 1) {
					let low = 1,
						high = Infinity,
						j = 0;
					for (; j < length; j++) {
						const row = layout[j]!,
							max = row.length;
						if (max < low) {
							break;
						} else if (max < high) {
							high = max;
						}
						const min = row.indexOf(row[max - 1]!) + 1;
						if (min > high) {
							break;
						} else if (min > low) {
							low = min;
						}
					}
					if (j < length) {
						const row = this.getNthRow(j) as TrToken,
							e = generateForChild(row, rect, rules[1], 'inconsistent-table', s[1]);
						e.startIndex++;
						e.startLine++;
						e.startCol = 0;
						errors.push(e);
					}
				}
			}
			return errors;
		}
	}

	// eslint-disable-next-line jsdoc/require-param
	/**
	 * Close the table syntax
	 *
	 * 闭合表格语法
	 * @param syntax syntax of the table end / 表格结尾语法
	 */
	close(syntax = '\n|}', halfParsed?: boolean): void {
		if (!this.lastChild.is<SyntaxToken>('table-syntax')) {
			Shadow.run(() => {
				const token = new SyntaxToken(
					halfParsed ? syntax : undefined,
					closingPattern,
					'table-syntax',
					this.getAttribute('config'),
					this.getAttribute('accum'),
					{'Stage-1': ':', '!ExtToken': '', TranscludeToken: ':'},
				);
				super.insertAt(token);

				/* NOT FOR BROWSER */

				if (!halfParsed) {
					token.afterBuild();
				}
			});
		}

		/* NOT FOR BROWSER */

		if (!halfParsed) {
			const {childNodes} = Parser.parseWithRef(syntax, this, 2);
			this.lastChild.safeReplaceChildren(childNodes);
		}
	}

	/**
	 * Get the table layout
	 *
	 * 获取表格布局
	 * @param stop stop condition / 中止条件
	 * @param stop.row stop at the row / 中止行
	 * @param stop.column stop at the column / 中止列
	 * @param stop.x stop at the row / 中止行
	 * @param stop.y stop at the column / 中止列
	 */
	@cached(false)
	getLayout(stop?: {row?: number, column?: number, x?: number, y?: number}): Layout {
		LINT: {
			const rows = this.getAllRows(),
				{length} = rows,
				layout = Layout.from(emptyArray(length, () => []));
			for (let i = 0; i < layout.length; i++) {
				const rowLayout = layout[i]!;

				/* NOT FOR BROWSER */

				if (i > (stop?.row ?? stop?.y ?? NaN)) {
					break;
				}

				/* NOT FOR BROWSER END */

				let j = 0,
					k = 0,
					last: boolean | undefined;
				for (const cell of rows[i]!.childNodes.slice(2)) {
					if (cell.is<TdToken>('td')) {
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

							/* NOT FOR BROWSER */

							if (i === stop?.row && j > stop.column!) {
								rowLayout[k] = coords;
								return layout;
							}

							/* NOT FOR BROWSER END */

							for (let y = i; y < Math.min(i + rowspan, length); y++) {
								for (let x = k; x < k + colspan; x++) {
									layout[y]![x] = coords;
								}
							}
							k += colspan;

							/* NOT FOR BROWSER */

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
	}

	/**
	 * Get all rows
	 *
	 * 获取所有行
	 */
	getAllRows(): (TrToken | this)[] {
		LINT: return [
			...super.getRowCount() ? [this] : [],
			...this.childNodes.slice(1)
				.filter((child): child is TrToken => child.is<TrToken>('tr') && child.getRowCount() > 0),
		];
	}

	/**
	 * Get the `n`-th row
	 *
	 * 获取第n行
	 * @param n row number / 行号
	 * @param force whether to regard the table itself as the first row / 是否将表格自身视为第一行
	 * @param insert whether to be used to insert a new row / 是否用于判断插入新行的位置
	 * @throws `RangeError` 不存在该行
	 */
	getNthRow(n: number, force: boolean, insert: true): TrToken | this | SyntaxToken | undefined;
	getNthRow(n: number, force?: boolean, insert?: false): TrToken | this | undefined;
	getNthRow(n: number, force?: boolean, insert?: boolean): TrToken | this | SyntaxToken | undefined {
		LINT: {
			const isRow = super.getRowCount();

			/* NOT FOR BROWSER */

			const nRows = this.getRowCount();
			n += n < 0 ? nRows : 0;

			/* NOT FOR BROWSER END */

			if (
				n === 0
				&& (
					isRow
					|| force && nRows === 0
				)
			) {
				return this;

				/* NOT FOR BROWSER */
			} else /* istanbul ignore if */ if (n < 0 || n > nRows || n === nRows && !insert) {
				throw new RangeError(`The table does not have row ${n}!`);

				/* NOT FOR BROWSER END */
			} else if (isRow) {
				n--;
			}
			for (const child of this.childNodes.slice(2)) {
				const {type} = child;
				if (type === 'tr' && child.getRowCount()) {
					n--;
					if (n < 0) {
						return child;
					}

					/* NOT FOR BROWSER */
				} else if (type === 'table-syntax') {
					return child;

					/* NOT FOR BROWSER END */
				}
			}
			return undefined;
		}
	}

	/** @private */
	override json(_?: string, start = this.getAbsoluteIndex()): AST {
		LSP: {
			const json = super.json(undefined, start);
			json['closed'] = this.closed;
			return json;
		}
	}

	/* NOT FOR BROWSER */

	/**
	 * @override
	 * @param token node to be inserted / 待插入的子节点
	 * @param i position to be inserted at / 插入位置
	 * @throws `SyntaxError` 表格的闭合部分非法
	 */
	override insertAt<T extends Token>(token: T, i = this.length): T {
		i += i < 0 ? this.length : 0;
		const previous = this.childNodes[i - 1];
		/* istanbul ignore else */
		if (typeof token !== 'string' && token.is<TdToken>('td') && previous?.is<TrToken>('tr')) {
			Parser.warn('The table cell is inserted into the current row instead.');
			return previous.insertAt(token);
		} else if (i > 0 && token instanceof SyntaxToken && token.pattern !== closingPattern) {
			throw new SyntaxError(`The closing part of the table is invalid: ${noWrap(token.toString())}`);
		}
		return super.insertAt(token, i);
	}

	override getRowCount(): number {
		return super.getRowCount()
			+ this.childNodes.filter(child => child.is<TrToken>('tr') && child.getRowCount()).length;
	}

	/**
	 * Get the next row
	 *
	 * 获取下一行
	 */
	getNextRow(): TrToken | undefined {
		return this.getNthRow(super.getRowCount() ? 1 : 0, false, false) as TrToken | undefined;
	}

	/**
	 * Get the cell with the specified coordinates
	 *
	 * 获取指定坐标的单元格
	 * @param coords table coordinates / 表格坐标
	 */
	getNthCell(coords: TableCoords | TableRenderedCoords): TdToken | undefined {
		require('../../addon/table');
		return this.getNthCell(coords);
	}

	/**
	 * Print the table layout
	 *
	 * 打印表格布局
	 */
	printLayout(): void {
		require('../../addon/table');
		this.printLayout();
	}

	/**
	 * Convert to table coordinates after rendering
	 *
	 * 转换为渲染后的表格坐标
	 * @param {TableCoords} coord table coordinates in wikitext / wikitext中的表格坐标
	 */
	toRenderedCoords(coord: TableCoords): TableRenderedCoords | undefined {
		require('../../addon/table');
		return this.toRenderedCoords(coord);
	}

	/**
	 * Convert to table coordinates in wikitext
	 *
	 * 转换为wikitext中的表格坐标
	 * @param {TableRenderedCoords} coord table coordinates after rendering / 渲染后的表格坐标
	 */
	toRawCoords(coord: TableRenderedCoords): TableCoords | undefined {
		require('../../addon/table');
		return this.toRawCoords(coord);
	}

	/**
	 * Get the full row
	 *
	 * 获取完整行
	 * @param y row number / 行号
	 */
	getFullRow(y: number): Map<TdToken, boolean> {
		require('../../addon/table');
		return this.getFullRow(y);
	}

	/**
	 * Get the full column
	 *
	 * 获取完整列
	 * @param x column number / 列号
	 */
	getFullCol(x: number): Map<TdToken, boolean> {
		require('../../addon/table');
		return this.getFullCol(x);
	}

	/**
	 * Format the row
	 *
	 * 设置行格式
	 * @param y row number / 行号
	 * @param attr table attribute / 表格属性
	 * @param multiRow whether to format multi-row cells / 是否对所有单元格设置，或是仅对行首单元格设置
	 */
	formatTableRow(y: number, attr?: TdAttrs | string, multiRow?: boolean): void {
		require('../../addon/table');
		this.formatTableRow(y, attr, multiRow);
	}

	/**
	 * Format the column
	 *
	 * 设置列格式
	 * @param x column number / 列号
	 * @param attr table attribute / 表格属性
	 * @param multiCol whether to format multi-column cells / 是否对所有单元格设置，或是仅对行首单元格设置
	 */
	formatTableCol(x: number, attr?: TdAttrs | string, multiCol?: boolean): void {
		require('../../addon/table');
		this.formatTableCol(x, attr, multiCol);
	}

	/**
	 * Fill the table row
	 *
	 * 填补表格行
	 * @param y row number / 行号
	 * @param inner content to fill / 填充内容
	 * @param subtype type of the cell / 单元格类型
	 * @param attr table attribute / 表格属性
	 */
	fillTableRow(y: number, inner: string | Token, subtype?: TdSubtypes, attr?: TdAttrs): void {
		require('../../addon/table');
		this.fillTableRow(y, inner, subtype, attr);
	}

	/**
	 * Fill the table
	 *
	 * 填补表格
	 * @param inner content to fill / 填充内容
	 * @param subtype type of the cell / 单元格类型
	 * @param attr table attribute / 表格属性
	 */
	fillTable(inner: string | Token, subtype?: TdSubtypes, attr?: TdAttrs): void {
		require('../../addon/table');
		this.fillTable(inner, subtype, attr);
	}

	override insertTableCell(
		inner: string | Token,
		coords: TableCoords | TableRenderedCoords,
		subtype?: TdSubtypes,
		attr?: TdAttrs,
	): TdToken {
		require('../../addon/table');
		return this.insertTableCell(inner, coords, subtype, attr);
	}

	/**
	 * Insert a table row
	 *
	 * 插入表格行
	 * @param y row number / 行号
	 * @param attr table row attribute / 表格行属性
	 * @param inner inner wikitext / 内部wikitext
	 * @param subtype type of the cell / 单元格类型
	 * @param innerAttr cell attribute / 单元格属性
	 */
	insertTableRow(
		y: number,
		attr?: Record<string, string | true>,
		inner?: string | Token,
		subtype?: TdSubtypes,
		innerAttr?: TdAttrs,
	): TrToken {
		require('../../addon/table');
		return this.insertTableRow(y, attr, inner, subtype, innerAttr);
	}

	/**
	 * Insert a table column
	 *
	 * 插入表格列
	 * @param x column number / 列号
	 * @param inner inner wikitext / 内部wikitext
	 * @param subtype type of the cell / 单元格类型
	 * @param attr cell attribute / 单元格属性
	 */
	insertTableCol(x: number, inner: string | Token, subtype?: TdSubtypes, attr?: TdAttrs): void {
		require('../../addon/table');
		this.insertTableCol(x, inner, subtype, attr);
	}

	/**
	 * Remove a table row
	 *
	 * 移除表格行
	 * @param y row number / 行号
	 */
	removeTableRow(y: number): TrToken {
		require('../../addon/table');
		return this.removeTableRow(y);
	}

	/**
	 * Remove a table column
	 *
	 * 移除表格列
	 * @param x column number / 列号
	 */
	removeTableCol(x: number): void {
		require('../../addon/table');
		this.removeTableCol(x);
	}

	/**
	 * Marge cells
	 *
	 * 合并单元格
	 * @param xlim column range / 列范围
	 * @param ylim row range / 行范围
	 */
	mergeCells(xlim: readonly [number, number], ylim: readonly [number, number]): TdToken {
		require('../../addon/table');
		return this.mergeCells(xlim, ylim);
	}

	/**
	 * Split a cell into rows
	 *
	 * 分裂成多行
	 * @param coords coordinates of the cell / 单元格坐标
	 */
	splitIntoRows(coords: TableCoords | TableRenderedCoords): void {
		require('../../addon/table');
		this.splitIntoRows(coords);
	}

	/**
	 * Split a cell into columns
	 *
	 * 分裂成多列
	 * @param coords coordinates of the cell / 单元格坐标
	 */
	splitIntoCols(coords: TableCoords | TableRenderedCoords): void {
		require('../../addon/table');
		this.splitIntoCols(coords);
	}

	/**
	 * Split a cell into cells
	 *
	 * 分裂成单元格
	 * @param coords coordinates of the cell / 单元格坐标
	 */
	splitIntoCells(coords: TableCoords | TableRenderedCoords): void {
		require('../../addon/table');
		this.splitIntoCells(coords);
	}

	/**
	 * Replicate a row and insert the result before the row
	 *
	 * 复制一行并插入该行之前
	 * @param row row number / 行号
	 */
	replicateTableRow(row: number): TrToken {
		require('../../addon/table');
		return this.replicateTableRow(row);
	}

	/**
	 * Replicate a column and insert the result before the column
	 *
	 * 复制一列并插入该列之前
	 * @param x column number / 列号
	 */
	replicateTableCol(x: number): TdToken[] {
		require('../../addon/table');
		return this.replicateTableCol(x);
	}

	/**
	 * Move a table row
	 *
	 * 移动表格行
	 * @param y row number / 行号
	 * @param before new position / 新位置
	 */
	moveTableRowBefore(y: number, before: number): TrToken {
		require('../../addon/table');
		return this.moveTableRowBefore(y, before);
	}

	/**
	 * Move a table row
	 *
	 * 移动表格行
	 * @param y row number / 行号
	 * @param after new position / 新位置
	 */
	moveTableRowAfter(y: number, after: number): TrToken {
		require('../../addon/table');
		return this.moveTableRowAfter(y, after);
	}

	/**
	 * Move a table column
	 *
	 * 移动表格列
	 * @param x column number / 列号
	 * @param before new position / 新位置
	 */
	moveTableColBefore(x: number, before: number): void {
		require('../../addon/table');
		this.moveTableColBefore(x, before);
	}

	/**
	 * Move a table column
	 *
	 * 移动表格列
	 * @param x column number / 列号
	 * @param after new position / 新位置
	 */
	moveTableColAfter(x: number, after: number): void {
		require('../../addon/table');
		this.moveTableColAfter(x, after);
	}

	/** @private */
	@cached()
	override toHtmlInternal(opt?: Omit<HtmlOpt, 'nocc'>): string {
		/**
		 * 过滤需要移出表格的节点
		 * @param token 表格或表格行
		 */
		const filter = (token: TrBaseToken): Token[] => token.childNodes.filter(isToken('table-inter'));
		const {childNodes} = this,
			tr = childNodes.filter(isToken<TrToken>('tr')),
			newOpt = {
				...opt,
				nowrap: true,
			},
			firstRow = super.toHtmlInternal(opt),
			newline = opt?.nowrap ? ' ' : '\n';
		return `${
			[this, ...tr].flatMap(filter).map(token => token.toHtmlInternal(newOpt).trim()).join(' ')
		}<table${childNodes[1].toHtmlInternal()}>${newline}<tbody>${
			firstRow + (tr.length > 0 && firstRow.endsWith('</tr>') ? newline : '')
		}${html(tr, newline, opt)}${tr.length === 0 && !firstRow ? '<tr><td></td></tr>' : ''}</tbody></table>`;
	}
}

classes['TableToken'] = __filename;
