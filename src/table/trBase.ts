import {generateForChild, isFostered} from '../../util/lint';
import {TableBaseToken} from './base';
import {
	TdToken,

	/* NOT FOR BROWSER */

	createTd,
} from './td';
import type {LintError} from '../../base';

/* NOT FOR BROWSER */

import {Shadow, isToken} from '../../util/debug';
import {classes} from '../../util/constants';
import {html} from '../../util/html';
import {cached} from '../../mixin/cached';
import {Token} from '../index';
import type {TdAttrs, TdSubtypes} from './td';
import type {AstNodes, SyntaxToken, TrToken} from '../../internal';

/* NOT FOR BROWSER END */

export interface TableCoords {
	readonly row: number;
	readonly column: number;
	readonly x?: undefined;
	readonly y?: undefined;
	readonly start?: boolean;
}

/**
 * table row or table
 *
 * 表格行或表格
 */
export abstract class TrBaseToken extends TableBaseToken {
	abstract override get type(): 'table' | 'tr';

	/** @private */
	override lint(start = this.getAbsoluteIndex(), re?: RegExp): LintError[] {
		const errors = super.lint(start, re),
			inter = this.childNodes.find(({type}) => type === 'table-inter');
		if (!inter) {
			return errors;
		}
		const severity = isFostered(inter);
		if (!severity) {
			return errors;
		}
		const error = generateForChild(
			inter,
			{start},
			'fostered-content',
			'content to be moved out from the table',
			severity,
		);
		error.startIndex++;
		error.startLine++;
		error.startCol = 0;
		errors.push(error);
		return errors;
	}

	/**
	 * Get the number of rows
	 *
	 * 获取行数
	 */
	getRowCount(): number {
		return Number(this.childNodes.some(
			child => child instanceof TdToken
				&& child.isIndependent()
				&& !child.firstChild.text().endsWith('+'),
		));
	}

	/* NOT FOR BROWSER */

	/**
	 * Get the `n`-th column
	 *
	 * 获取第n列
	 * @param n column number / 列号
	 * @param insert whether to be used to insert a new column / 是否用于判断插入新列的位置
	 * @throws `RangeError` 不存在对应单元格
	 */
	getNthCol(n: number, insert?: false): TdToken | undefined;
	getNthCol(n: number, insert: true): TdToken | TrToken | SyntaxToken | undefined;
	getNthCol(n: number, insert?: boolean): TdToken | TrToken | SyntaxToken | undefined {
		const nCols = this.getColCount();
		n += n < 0 ? nCols : 0;
		/* istanbul ignore if */
		if (n < 0 || n > nCols || n === nCols && !insert) {
			throw new RangeError(`There is no cell at position ${n}!`);
		}
		let last = 0;
		for (const child of this.childNodes.slice(2)) {
			if (child instanceof TdToken) {
				if (child.isIndependent()) {
					last = Number(child.subtype !== 'caption');
				}
				n -= last;
				if (n < 0) {
					return child;
				}
			} else if (child.is<TrToken>('tr') || child.is<SyntaxToken>('table-syntax')) {
				return child;
			}
		}
		return undefined;
	}

	/** 修复简单的表格语法错误 */
	#correct(): void {
		const {childNodes: [,, child]} = this;
		if (child?.constructor === Token) {
			const {firstChild} = child;
			if (firstChild?.type !== 'text') {
				child.prepend('\n');
			} else if (!firstChild.data.startsWith('\n')) {
				firstChild.insertData(0, '\n');
			}
		}
	}

	/** @private */
	override text(): string {
		this.#correct();
		return super.text();
	}

	/** @private */
	override toString(skip?: boolean): string {
		this.#correct();
		return super.toString(skip);
	}

	/**
	 * @override
	 * @param i position of the child node / 移除位置
	 */
	override removeAt(i: number): AstNodes {
		i += i < 0 ? this.length : 0;
		const child = this.childNodes[i];
		if (child instanceof TdToken && child.isIndependent()) {
			const {nextSibling} = child;
			if (nextSibling?.is<TdToken>('td')) {
				nextSibling.independence();
			}
		}
		return super.removeAt(i);
	}

	/**
	 * @override
	 * @param token node to be inserted / 待插入的子节点
	 * @param i position to be inserted at / 插入位置
	 */
	override insertAt<T extends Token>(token: T, i = this.length): T {
		if (!Shadow.running && !token.is<TdToken>('td')) {
			/* istanbul ignore next */
			if (this.is<TrToken>('tr')) {
				this.typeError('insertAt', 'TdToken');
			} else if (!token.is<TrToken>('tr')) {
				this.typeError('insertAt', 'TrToken', 'TdToken');
			}
		}
		i += i < 0 ? this.length : 0;
		const child = this.childNodes[i];
		if (token instanceof TdToken && token.isIndependent() && child instanceof TdToken) {
			child.independence();
		}
		return super.insertAt(token, i);
	}

	/**
	 * Get the number of columns
	 *
	 * 获取列数
	 */
	getColCount(): number {
		let count = 0,
			last = 0;
		for (const child of this.childNodes) {
			if (child instanceof TdToken) {
				last = child.isIndependent() ? Number(child.subtype !== 'caption') : last;
				count += last;
			}
		}
		return count;
	}

	/**
	 * Insert a new cell
	 *
	 * 插入新的单元格
	 * @param inner inner wikitext of the cell / 单元格内部wikitext
	 * @param {TableCoords} coord table coordinates of the cell / 单元格坐标
	 * @param subtype cell type / 单元格类型
	 * @param attr cell attribute / 单元格属性
	 */
	insertTableCell(
		inner: string | Token,
		{column}: TableCoords,
		subtype: TdSubtypes = 'td',
		attr: TdAttrs = {},
	): TdToken {
		return this.insertBefore(
			createTd(inner, subtype, attr, this.getAttribute('include'), this.getAttribute('config')),
			this.getNthCol(column, true),
		);
	}

	/** @private */
	@cached()
	override toHtmlInternal(opt?: Omit<HtmlOpt, 'nocc'>): string {
		const {childNodes, type} = this,
			td = childNodes.filter(isToken<TdToken>('td'));
		return td.some(({subtype}) => subtype !== 'caption')
			? `<tr${type === 'tr' ? childNodes[1].toHtmlInternal() : ''}>${html(td, '', opt)}</tr>`
			: html(td, '', opt);
	}
}

classes['TrBaseToken'] = __filename;
