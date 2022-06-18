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
	}

	type accum = Token[];
	type acceptable = Record<string, number|string|Ranges|(number|string)[]>;

	interface BracketExecArray extends RegExpExecArray {
		parts: string[][];
		findEqual: boolean;
		pos: number;
	}
}

export {};
