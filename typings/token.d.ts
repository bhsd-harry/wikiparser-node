import Token = require('../src');
import Ranges = require('../lib/ranges');

export type accum = Token[];
export type acceptable = Record<string, number|string|Ranges|(number|string)[]>;

export interface LintError {
	message: string;
	severity: 'error'|'warning';
	startIndex: number;
	endIndex: number;
	startLine: number;
	startCol: number;
	endLine: number;
	endCol: number;
	excerpt: string;
}
