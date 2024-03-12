import {generateForChild} from '../../util/lint';
import {Shadow, emptyArray} from '../../util/debug';
import Parser from '../../index';
import {TrBaseToken} from './trBase';
import {SyntaxToken} from '../syntax';
import type {
	LintError,
	AST,
} from '../../base';
import type {AttributesToken, TdToken, TrToken, Token} from '../../internal';
import type {TableCoords} from './trBase';
import type {TdAttrs, TdSubtypes, TdSpanAttrs} from './td';

const closingPattern = /^\n[^\S\n]*(?:\|\}|\{\{\s*!\s*\}\}\}|\{\{\s*!\)\s*\}\})$/u;

/**
 * 是否是行尾
 * @param {Token} cell 表格单元格
 */
export const isRowEnd = ({type}: Token): boolean => type === 'tr' || type === 'table-syntax';

/** @extends {Array<TableCoords[]>} */
export class Layout extends Array<TableCoords[]> {
	/* NOT FOR BROWSER */

	/** 打印表格布局 */
	print(): void {
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
				const bit = (vBorderTop[j]! << 3) + (vBorderBottom[j]! << 0)
					+ (hBorder[j - 1]! << 2) + (hBorder[j]! << 1);
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
export abstract class TableToken extends TrBaseToken {
	override readonly type = 'table';

	declare readonly childNodes: readonly [SyntaxToken, AttributesToken, ...(TdToken | TrToken)[], SyntaxToken]
	| readonly [SyntaxToken, AttributesToken, ...(TdToken | TrToken)[]];
	abstract override get lastChild(): AttributesToken | TdToken | TrToken | SyntaxToken;

	/** 表格是否闭合 */
	get closed(): boolean {
		return this.lastChild.type === 'table-syntax';
	}

	/**
	 * @param syntax 表格语法
	 * @param attr 表格属性
	 */
	constructor(syntax: string, attr?: string, config = Parser.getConfig(), accum: Token[] = []) {
		super(/^(?:\{\||\{\{\{\s*!\s*\}\}|\{\{\s*\(!\s*\}\})$/u, syntax, attr, config, accum, {
		});
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
			if (i > (stop?.row ?? stop?.y ?? NaN)) {
				break;
			}
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
							rowspan = cell.getAttr('rowspan'),
							colspan = cell.getAttr('colspan');
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

	/** @override */
	override lint(start = this.getAbsoluteIndex(), re?: RegExp): LintError[] {
		const errors = super.lint(start, re);
		if (!this.closed) {
			errors.push(
				generateForChild(this.firstChild, {start}, 'unclosed-table', Parser.msg('unclosed $1', 'table')),
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
				const {colspan} = this.getNthCell(row[row.length - 1]!)!,
					min = max - colspan + 1;
				if (min > high) {
					break;
				} else if (min > low) {
					low = min;
				}
			}
			if (j < length) {
				errors.push(generateForChild(
					this.getNthRow(j)!,
					{start},
					'table-layout',
					'inconsistent table layout',
					'warning',
				));
			}
		}
		return errors;
	}

	/**
	 * 闭合表格语法
	 * @param syntax 表格结尾语法
	 * @param halfParsed
	 */
	close(syntax = '\n|}', halfParsed = false): void {
		const config = this.getAttribute('config'),
			accum = this.getAttribute('accum'),
			inner = halfParsed ? [syntax] : Parser.parse(syntax, this.getAttribute('include'), 2, config).childNodes;
		const token = Shadow.run(() => super.insertAt(
			new SyntaxToken(undefined, closingPattern, 'table-syntax', config, accum, {
			}),
		));
		if (!halfParsed) {
			token.afterBuild();
		}
		(this.lastChild as SyntaxToken).replaceChildren(...inner);
	}

	/** @override */
	override json(): AST {
		const json = super.json();
		json['closed'] = this.closed;
		return json;
	}
}
