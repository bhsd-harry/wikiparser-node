import {generateForChild} from '../../util/lint';
import {TableBaseToken} from './base';
import type {LintError} from '../../base';
import type {
	AstNodes,
	ArgToken,
	TranscludeToken,
} from '../../internal';

export interface TableCoords {
	row: number;
	column: number;
	x?: undefined;
	y?: undefined;
	start?: boolean;
}

/** 表格行或表格 */
export abstract class TrBaseToken extends TableBaseToken {
	declare type: 'table' | 'tr';

	/** @override */
	override lint(start = this.getAbsoluteIndex()): LintError[] {
		const errors = super.lint(start),
			inter = this.childNodes.find(({type}) => type === 'table-inter');
		if (!inter) {
			return errors;
		}
		const first = (inter.childNodes as AstNodes[]).find(child => child.text().trim()),
			tdPattern = /^\s*(?:!|\{\{\s*![!-]?\s*\}\})/u;
		if (!first || tdPattern.test(String(first))
			|| first.type === 'arg' && tdPattern.test((first as ArgToken).default || '')
		) {
			return errors;
		} else if (first.type === 'magic-word') {
			try {
				if ((first as TranscludeToken).getPossibleValues().every(token => tdPattern.test(token.text()))) {
					return errors;
				}
			} catch {}
		}
		const error = generateForChild(inter, {start}, 'content to be moved out from the table');
		errors.push({
			...error,
			startIndex: error.startIndex + 1,
			startLine: error.startLine + 1,
			startCol: 0,
		});
		return errors;
	}
}
