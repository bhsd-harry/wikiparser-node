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
		interwiki: string[];
		img: Record<string, string>;
		variants: string[];
	}

	type accum = Token[];
}

export {};
