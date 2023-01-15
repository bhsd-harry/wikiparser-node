import Token from '../src';

declare global {
	interface ParserConfig {
		ext: string[];
		html: [string[], string[], string[]];
		namespaces: Record<string, string>;
		nsid: Record<string, number>;
		parserFunction: [string[], string[], string[], string[]];
		doubleUnderscore: [string[], string[]];
		protocol: string;
		img: Record<string, string>;
		variants: string[];
		interwiki: string[];
	}

	type accum = Token[];

	interface LintError {
		message: string;
		severity: 'error'|'warning';
		startLine: number;
		startCol: number;
		endLine: number;
		endCol: number;
	}
}

export {};
