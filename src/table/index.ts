import {generateForChild} from '../../util/lint';
import {
	Shadow,
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

export type TableTokens = TableToken | TrToken | TdToken;

/**
 * 生成一个指定长度的空数组
 * @param n 数组长度
 * @param callback 回调函数
 */
const emptyArray = <T>(n: number, callback: (i: number) => T): T[] =>
	new Array(n).fill(undefined).map((_, i) => callback(i));

/**
 * 是否是行尾
 * @param {Token} cell 表格单元格
 */
export const isRowEnd = ({type}: Token): boolean => type === 'tr' || type === 'table-syntax';

/** @extends {Array<TableCoords[]>} */
export class Layout extends Array<TableCoords[]> {
	// @ts-expect-error abstract override
	abstract override static from(arr: TableCoords[][]): Layout;
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

	override get type(): 'table' {
		return 'table';
	}

	/** whether the table is closed / 表格是否闭合 */
	get closed(): boolean {
		return this.lastChild.is<SyntaxToken>('table-syntax');
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
			rect = new BoundingRect(this, start),
			rules = ['unclosed-table', 'table-layout'] as const,
			s = rules.map(rule => Parser.lintConfig.getSeverity(rule));
		if (s[0] && !this.closed) {
			errors.push(
				generateForChild(this.firstChild, rect, rules[0], Parser.msg('unclosed $1', 'table'), s[0]),
			);
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
						e = generateForChild(row, rect, rules[1], 'inconsistent table layout', s[1]);
					e.startIndex++;
					e.startLine++;
					e.startCol = 0;
					errors.push(e);
				}
			}
		}
		return errors;
	}

	// eslint-disable-next-line jsdoc/require-param
	/**
	 * Close the table syntax
	 *
	 * 闭合表格语法
	 * @param syntax syntax of the table end / 表格结尾语法
	 */
	close(syntax = '\n|}', halfParsed?: boolean): void {
		const config = this.getAttribute('config'),
			accum = this.getAttribute('accum');
		Shadow.run(() => {
			const token = new SyntaxToken(
				halfParsed ? syntax : undefined,
				'table-syntax',
				config,
				accum,
			);
			super.insertAt(token);
		});
	}

	// eslint-disable-next-line jsdoc/require-param
	/**
	 * Get the table layout
	 *
	 * 获取表格布局
	 */
	@cached(false)
	getLayout(stop?: {row?: number, column?: number, x?: number, y?: number}): Layout {
		const rows = this.getAllRows(),
			{length} = rows,
			layout = Layout.from(emptyArray(length, () => []));
		for (let i = 0; i < layout.length; i++) {
			const rowLayout = layout[i]!;
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

	/**
	 * Get all rows
	 *
	 * 获取所有行
	 */
	getAllRows(): (TrToken | this)[] {
		return [
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
	 */
	getNthRow(n: number, force?: boolean, insert?: false): TrToken | this | undefined;
	getNthRow(n: number, force?: boolean, insert?: boolean): TrToken | this | SyntaxToken | undefined {
		const isRow = super.getRowCount();
		if (
			n === 0
			// eslint-disable-next-line @stylistic/no-extra-parens
			&& (
				isRow
			)
		) {
			return this;
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
			}
		}
		return undefined;
	}

	/** @private */
	override json(_?: string, start = this.getAbsoluteIndex()): AST {
		const json = super.json(undefined, start);
		json['closed'] = this.closed;
		return json;
	}
}
