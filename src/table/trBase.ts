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

const tableTags = new Set(['tr', 'td', 'th', 'caption']),
	tableTemplates = new Set(['Template:!!', 'Template:!-']);

/**
 * Check if the content is fostered
 * @param token
 */
const isFostered = (token: AstNodes): LintError.Severity | false => {
	const first = token.childNodes.find(child => child.text().trim());
	if (
		!first
		|| first.text().trim().startsWith('!')
		|| first.type === 'magic-word' && first.name === '!'
		|| first.type === 'template' && tableTemplates.has(first.name!)
		|| first.is<HtmlToken>('html') && tableTags.has(first.name)
	) {
		return false;
	} else if (first.is<ArgToken>('arg')) {
		return first.length > 1 && isFostered(first.childNodes[1]!);
	} else if (first.is<TranscludeToken>('magic-word')) {
		try {
			const severity = first.getPossibleValues().map(isFostered);
			return severity.includes('error')
				? 'error'
				: severity.includes('warning') && 'warning';
		} catch {}
	}
	return first.type === 'template' ? 'warning' : 'error';
};

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
}
