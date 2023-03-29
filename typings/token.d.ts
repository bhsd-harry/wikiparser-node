import Token = require('../src');

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
	excludes: string[];
}

export type accum = Token[];

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
