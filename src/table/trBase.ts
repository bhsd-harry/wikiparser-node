import {generateForChild} from '../../util/lint';
import {
	isToken,
} from '../../util/debug';
import {TableBaseToken} from './base';
import type {LintError} from '../../base';
import type {
	AstNodes,
	ArgToken,
	TranscludeToken,
} from '../../internal';

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
}
