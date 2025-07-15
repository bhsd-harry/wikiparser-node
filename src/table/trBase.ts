import {generateForChild, isFostered} from '../../util/lint';
import {TableBaseToken} from './base';
import {
	TdToken,
} from './td';
import type {LintError} from '../../base';

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
			'content to be moved outside the table',
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
}
