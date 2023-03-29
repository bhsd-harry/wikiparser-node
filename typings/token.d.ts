import Token = require('../src');
import Ranges = require('../lib/ranges');

export interface ParserConfig {
	ext: string[];
	html: string[][];
	namespaces: Record<string, string>;
	nsid: Record<string, number>;
	parserFunction: [Record<string, string>, string[], string[], string[]];
	doubleUnderscore: string[][];
	protocol: string;
	img: Record<string, string>;
	variants: string[];
	interwiki: string[];
	excludes: string[];
}

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
