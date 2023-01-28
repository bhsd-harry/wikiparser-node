import Token from '../src';

declare global {
	interface ParserConfig {
		ext: string[];
		html: string[][];
		namespaces: Record<string, string>;
		nsid: Record<string, number>;
		parserFunction: [Record<string, string>, string[], string[], string[]];
		doubleUnderscore: string[][];
		protocol: string;
		img: Record<string, string>;
		variants: string[];
	}

	type accum = Token[];

	interface LintError {
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
}

export {};
