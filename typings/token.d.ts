import Token from '../src';
import Ranges from '../lib/ranges';

declare global {
	interface ParserConfig {
		ext: string[];
		html: [string[], string[], string[]];
		namespaces: Record<string, string>;
		nsid: Record<string, number>;
		parserFunction: [string[], string[], string[], string[]];
		doubleUnderscore: [string[], string[]];
		protocol: string;
		interwiki: string[];
		img: Record<string, string>;
		variants: string[];
	}

	type accum = Token[];
	type acceptable = Record<string, number|string|Ranges|(number|string)[]>;

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
