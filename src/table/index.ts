import {generateForChild} from '../../util/lint';
import {BoundingRect} from '../../lib/rect';
import {
	Shadow,
	emptyArray,
} from '../../util/debug';
import Parser from '../../index';
import {TrBaseToken} from './trBase';
import {SyntaxToken} from '../syntax';
import type {
	Config,
	LintError,
} from '../../base';
import type {AttributesToken, TdToken, TrToken, Token} from '../../internal';
import type {TableCoords} from './trBase';

const closingPattern = /^\n[^\S\n]*(?:\|\}|\{\{\s*!\s*\}\}\}|\{\{\s*!\)\s*\}\})$/u;

/**
 * 是否是行尾
 * @param {Token} cell 表格单元格
 */
export const isRowEnd = ({type}: Token): boolean => type === 'tr' || type === 'table-syntax';

/** @extends {Array<TableCoords[]>} */
export class Layout extends Array<TableCoords[]> {
}

/**
 * 表格
 * @classdesc `{childNodes: [SyntaxToken, AttributesToken, ?Token, ...TdToken, ...TrToken, ?SyntaxToken]}`
 */
export abstract class TableToken extends TrBaseToken {
	declare readonly childNodes: readonly [SyntaxToken, AttributesToken, ...(TdToken | TrToken)[], SyntaxToken]
	| readonly [SyntaxToken, AttributesToken, ...(TdToken | TrToken)[]];
	abstract override get lastChild(): AttributesToken | TdToken | TrToken | SyntaxToken;

	override get type(): 'table' {
		return 'table';
	}

	/** 表格是否闭合 */
	get closed(): boolean {
		return this.lastChild.type === 'table-syntax';
	}

	/**
	 * @param syntax 表格语法
	 * @param attr 表格属性
	 */
	constructor(syntax: string, attr?: string, config?: Config, accum?: Token[]) {
		super(/^(?:\{\||\{\{\{\s*!\s*\}\}|\{\{\s*\(!\s*\}\})$/u, syntax, 'table', attr, config, accum, {
		});
	}

	/** @private */
	override lint(start = this.getAbsoluteIndex(), re?: RegExp): LintError[] {
		const errors = super.lint(start, re),
			rect = new BoundingRect(this, start);
		if (!this.closed) {
			errors.push(
				generateForChild(this.firstChild, rect, 'unclosed-table', Parser.msg('unclosed $1', 'table')),
			);
		}
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
				const e = generateForChild(
					this.getNthRow(j) as TrToken,
					rect,
					'table-layout',
					'inconsistent table layout',
					'warning',
				);
				e.startIndex++;
				e.startLine++;
				e.startCol = 0;
				errors.push(e);
			}
		}
		return errors;
	}

	/**
	 * 闭合表格语法
	 * @param syntax 表格结尾语法
	 * @param halfParsed
	 */
	close(syntax = '\n|}', halfParsed?: boolean): void {
		const config = this.getAttribute('config'),
			accum = this.getAttribute('accum'),
			inner = halfParsed ? [syntax] : Parser.parse(syntax, this.getAttribute('include'), 2, config).childNodes;
		Shadow.run(() => {
			const token = new SyntaxToken(undefined, closingPattern, 'table-syntax', config, accum, {
			});
			super.insertAt(token);
		});
		(this.lastChild as SyntaxToken).replaceChildren(...inner);
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
			layout = new Layout(...emptyArray(length, () => []));
		for (let i = 0; i < length; i++) {
			const rowLayout = layout[i]!;
			let j = 0,
				k = 0,
				last: boolean | undefined;
			for (const cell of rows[i]!.childNodes.slice(2)) {
				if (cell.type === 'td') {
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
						for (let y = i; y < Math.min(i + rowspan, length); y++) {
							for (let x = k; x < k + colspan; x++) {
								layout[y]![x] = coords;
							}
						}
						k += colspan;
					}
				} else if (isRowEnd(cell)) {
					break;
				}
			}
		}
		return layout;
	}

	/** 获取所有行 */
	getAllRows(): (TrToken | this)[] {
		return [
			...super.getRowCount() ? [this] : [],
			...this.childNodes.slice(1)
				.filter((child): child is TrToken => child.type === 'tr' && child.getRowCount() > 0),
		];
	}

	/**
	 * 获取指定坐标的单元格
	 * @param coords 表格坐标
	 */
	getNthCell(
		coords: TableCoords
	): TdToken | undefined {
		let rawCoords: TableCoords | undefined = coords as TableCoords;
		return rawCoords && this.getNthRow(rawCoords.row, false, false)?.getNthCol(rawCoords.column);
	}

	/**
	 * 获取第n行
	 * @param n 行号
	 * @param force 是否将表格自身视为第一行
	 * @param insert 是否用于判断插入新行的位置
	 * @throws `RangeError` 不存在该行
	 */
	getNthRow(n: number, force?: boolean, insert?: false): TrToken | this | undefined;
	getNthRow(n: number, force?: boolean, insert?: boolean): TrToken | this | SyntaxToken | undefined {
		const isRow = super.getRowCount();
		if (
			n === 0
			&& (
				isRow
			)
		) {
			return this;
		} else if (isRow) {
			n--;
		}
		for (const child of this.childNodes.slice(2)) {
			if (child.type === 'tr' && child.getRowCount()) {
				n--;
				if (n < 0) {
					return child;
				}
			}
		}
		return undefined;
	}
}
