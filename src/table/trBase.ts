import {generateForChild} from '../../util/lint';
import {
	isToken,

	/* NOT FOR BROWSER */

	Shadow,
} from '../../util/debug';
import {classes} from '../../util/constants';
import {Token} from '..';
import {TableBaseToken} from './base';
import {TdToken, createTd} from './td';
import type {LintError} from '../../base';
import type {
	AstNodes,
	ArgToken,
	TranscludeToken,

	/* NOT FOR BROWSER */

	SyntaxToken,
	TrToken,
} from '../../internal';
import type {TdAttrs, TdSubtypes} from './td';

export interface TableCoords {
	readonly row: number;
	readonly column: number;
	readonly x?: undefined;
	readonly y?: undefined;
	readonly start?: boolean;
}

/** 表格行或表格 */
export abstract class TrBaseToken extends TableBaseToken {
	declare type: 'table' | 'tr';

	/** @override */
	override lint(start = this.getAbsoluteIndex(), re?: RegExp): LintError[] {
		const errors = super.lint(start, re),
			inter = this.childNodes.find(({type}) => type === 'table-inter');
		if (!inter) {
			return errors;
		}
		const first = (inter.childNodes as AstNodes[]).find(child => child.text().trim()),
			tdPattern = /^\s*(?:!|\{\{\s*![!-]?\s*\}\})/u,
			isArg = isToken<ArgToken>('arg'),
			isTransclude = isToken<TranscludeToken>('magic-word');
		if (
			!first
			|| tdPattern.test(String(first))
			|| isArg(first) && tdPattern.test(first.default || '')
		) {
			return errors;
		} else if (isTransclude(first)) {
			try {
				if (first.getPossibleValues().every(token => tdPattern.test(token.text()))) {
					return errors;
				}
			} catch {}
		}
		const error = generateForChild(inter, {start}, 'fostered-content', 'content to be moved out from the table');
		error.severity = first.type === 'template' ? 'warning' : 'error';
		error.startIndex++;
		error.startLine++;
		error.startCol = 0;
		errors.push(error);
		return errors;
	}

	/** 获取行数 */
	getRowCount(): number {
		return Number(this.childNodes.some(
			child => child instanceof TdToken && child.isIndependent() && !child.firstChild.text().endsWith('+'),
		));
	}

	/**
	 * 获取第n列
	 * @param n 列号
	 * @param insert 是否用于判断插入新列的位置
	 * @throws `RangeError` 不存在对应单元格
	 */
	getNthCol(n: number, insert?: false): TdToken | undefined;
	getNthCol(n: number, insert: true): TdToken | TrToken | SyntaxToken | undefined;
	getNthCol(n: number, insert = false): TdToken | TrToken | SyntaxToken | undefined {
		/* NOT FOR BROWSER */

		const nCols = this.getColCount();
		n += n < 0 ? nCols : 0;
		if (n < 0 || n > nCols || n === nCols && !insert) {
			throw new RangeError(`不存在第 ${n} 个单元格！`);
		}

		/* NOT FOR BROWSER END */

		let last = 0;
		const isTr = isToken<TrToken>('tr'),
			isSyntax = isToken<SyntaxToken>('table-syntax');
		for (const child of this.childNodes.slice(2)) {
			if (child instanceof TdToken) {
				if (child.isIndependent()) {
					last = Number(child.subtype !== 'caption');
				}
				n -= last;
				if (n < 0) {
					return child;
				}
			} else if (isTr(child) || isSyntax(child)) {
				return child;
			}
		}
		return undefined;
	}

	/* NOT FOR BROWSER */

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

	/** @override */
	override text(): string {
		this.#correct();
		return super.text();
	}

	/** @private */
	override toString(): string {
		this.#correct();
		return super.toString();
	}

	/**
	 * @override
	 * @param i 移除位置
	 */
	override removeAt(i: number): AstNodes {
		i += i < 0 ? this.length : 0;
		const child = this.childNodes[i];
		if (child instanceof TdToken && child.isIndependent()) {
			const {nextSibling} = child;
			if (nextSibling?.type === 'td') {
				nextSibling.independence();
			}
		}
		return super.removeAt(i);
	}

	/**
	 * @override
	 * @param token 待插入的子节点
	 * @param i 插入位置
	 */
	override insertAt<T extends Token>(token: T, i = this.length): T {
		if (!Shadow.running && token.type !== 'td') {
			if (this.type === 'tr') {
				this.typeError('insertAt', 'TdToken');
			} else if (token.type !== 'tr') {
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

	/** 获取列数 */
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
	 * 插入新的单元格
	 * @param inner 单元格内部wikitext
	 * @param {TableCoords} coord 单元格坐标
	 * @param subtype 单元格类型
	 * @param attr 单元格属性
	 */
	insertTableCell(
		inner: string | Token,
		{column}: TableCoords,
		subtype: TdSubtypes = 'td',
		attr: TdAttrs = {},
	): TdToken {
		const token = createTd(inner, subtype, attr, this.getAttribute('include'), this.getAttribute('config'));
		return this.insertBefore(token, this.getNthCol(column, true));
	}
}

classes['TrBaseToken'] = __filename;
