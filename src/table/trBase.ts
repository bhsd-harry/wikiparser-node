import {generateForChild} from '../../util/lint';
import {TableBaseToken} from './base';
import {
	TdToken,
} from './td';
import type {LintError} from '../../base';
import type {
	AstNodes,
	ArgToken,
	TranscludeToken,
	HtmlToken,
} from '../../internal';

export interface TableCoords {
	readonly row: number;
	readonly column: number;
	readonly x?: undefined;
	readonly y?: undefined;
	readonly start?: boolean;
}

const tableTags = new Set(['tr', 'td', 'th', 'caption']);

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
		const first = (inter.childNodes as AstNodes[]).find(child => child.text().trim()),
			tdPattern = /^\s*(?:!|\{\{\s*![!-]?\s*\}\})/u;
		if (
			!first
			|| tdPattern.test(first.toString())
			|| first.is<ArgToken>('arg') && tdPattern.test(first.default || '')
			|| first.is<HtmlToken>('html') && tableTags.has(first.name)
		) {
			return errors;
		} else if (first.is<TranscludeToken>('magic-word')) {
			try {
				if (first.getPossibleValues().every(token => tdPattern.test(token.text()))) {
					return errors;
				}
			} catch {}
		}
		const error = generateForChild(
			inter,
			{start},
			'fostered-content',
			'content to be moved out from the table',
		);
		error.severity = first.type === 'template' ? 'warning' : 'error';
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
