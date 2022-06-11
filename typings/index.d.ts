import Token from '../src/token';
import {Range} from '../lib/range';

declare global {
	interface ParserConfig {
		include: string[],
		ext: string[];
		html: [string[], string[], string[]];
		namespaces: Record<string, string>;
		nsid: Record<string, number>;
		parserFunction: [string[], string[]];
	}

	interface Parser {
		warning: boolean;
		debugging: boolean;
		/** 默认输出到console.warn */
		warn: (msg: string, ...args: any[]) => void;
		/** 默认不输出到console.debug */
		debug: (msg: string, ...args: any[]) => void;
		/** 总是输出到console.error */
		error: (msg: string, ...args: any[]) => void;

		/** 只储存导出各个Class的文件路径 */
		classes: Record<string, string>;
		mixins: Record<string, string>;
		defaultPaths: Record<string, string>;
		/** 清除各模块的缓存 */
		clearCache: (type?: string) => void;

		config: string;
		getConfig: () => ParserConfig;

		normalizeTitle: (title: string, defaultNs?: number) => string;

		MAX_STAGE: number;
		parse: (wikitext: string|Token, maxStage?: number) => Token;

		create: (className: string, ...args: any[]) => Token;
	}

	type pseudo = 'root'|'is'|'not'|'nth-child'|'nth-of-type'|'nth-last-child'|'nth-last-of-type'
		|'first-child'|'first-of-type'|'last-child'|'last-of-type'|'only-child'|'only-of-type'|'empty'
		|'contains'|'has'|'header'|'parent'|'hidden'|'visible';
	type pseudoCall = Record<pseudo, string[]>;

	interface AstEvent extends Event {
		target: Token;
		currentTarget: Token;
		prevTarget: ?Token;
		path: Token[];
	};
	interface AstEventData {
		position: number;
		removed: string|Token;
		inserted: string|Token;
		oldToken: Token;
		newToken: Token;
		oldKey: string;
		newKey: string;
	}
	type AstListener = (e: AstEvent, data: AstEventData) => any;

	interface BracketExecArray extends RegExpExecArray {
		parts: string[][];
		findEqual: boolean;
		pos: number;
	}

	type accum = Token[];
	type acceptable = Record<string, number|string|(number|string)[]>;
	
	type RangesSpread = Range[];

	interface CollectionCallback<T, S> extends Function {
		call: (thisArg: string|Token, i: number, ele: S) => T;
	}
	type CollectionMap = (arr: Token[]) => (string|Token)[];
}

export {};
