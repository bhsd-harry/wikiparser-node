import * as assert from 'assert/strict';
import {generateForChild} from '../../util/lint';
import {noWrap} from '../../util/string';
import * as Parser from '../../index';
import {Token} from '..';
import {TrToken} from './tr';
import {TrBaseToken} from './trBase';
import {TdToken, createTd} from './td';
import {SyntaxToken} from '../syntax';
import type {LintError} from '../../index';
import type {AttributesToken} from '../../internal';
import type {TableCoords} from './trBase';
import type {TdAttrs, TdSubtypes} from './td';

declare interface TableRenderedCoords {
	row?: undefined;
	column?: undefined;
	x: number;
	y: number;
}

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
// @ts-expect-error not implementing all abstract methods
export class TableToken extends TrBaseToken {
	override readonly type = 'table';

	declare childNodes: [SyntaxToken, AttributesToken, ...(TdToken | TrToken)[], SyntaxToken]
		| [SyntaxToken, AttributesToken, ...(TdToken | TrToken)[]];
	// @ts-expect-error abstract method
	abstract override get children(): [SyntaxToken, AttributesToken, ...(TdToken | TrToken)[], SyntaxToken]
		| [SyntaxToken, AttributesToken, ...(TdToken | TrToken)[]];
	// @ts-expect-error abstract method
	abstract override get lastChild(): AttributesToken | TdToken | TrToken | SyntaxToken;
	// @ts-expect-error abstract method
	abstract override get lastElementChild(): AttributesToken | TdToken | TrToken | SyntaxToken;

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
			Token: 2, SyntaxToken: [0, -1], AttributesToken: 1, TdToken: '2:', TrToken: '2:',
		});
	}

	/** @override */
	override lint(start = this.getAbsoluteIndex()): LintError[] {
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
	 * @param syntax 表格结尾语法
	 * @param halfParsed
	 * @throws `SyntaxError` 表格的闭合部分不符合语法
	 */
	close(syntax = '\n|}', halfParsed = false): void {
		halfParsed &&= Parser.running;
		const config = this.getAttribute('config'),
			accum = this.getAttribute('accum'),
			inner = !halfParsed && Parser.parse(syntax, this.getAttribute('include'), 2, config),
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
}

Parser.classes['TableToken'] = __filename;
