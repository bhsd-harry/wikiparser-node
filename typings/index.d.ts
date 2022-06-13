import Token from '../src/token';
import {Range, Ranges} from '../lib/range';
import $ from '../tool';
import ParameterToken from '../src/parameterToken';

declare global {
	interface ParserConfig {
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
		clearCache: () => void;

		config: string;
		getConfig: () => ParserConfig;

		normalizeTitle: (title: string, defaultNs?: number) => string;

		readonly MAX_STAGE: number;
		parse: (wikitext: string|Token, include?: boolean, maxStage?: number, config?: ParserConfig) => Token;

		create: (className: string, ...args: any[]) => Token;

		getTool: () => typeof $;
	}

	type pseudo = 'root'|'is'|'not'|'nth-child'|'nth-of-type'|'nth-last-child'|'nth-last-of-type'
		|'first-child'|'first-of-type'|'last-child'|'last-of-type'|'only-child'|'only-of-type'|'empty'
		|'contains'|'has'|'header'|'parent'|'hidden'|'visible';
	type pseudoCall = Record<pseudo, string[]>;

	interface AstEvent extends Event {
		readonly target: Token;
		currentTarget: Token;
		prevTarget: ?Token;
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

	interface TokenPosition {
		line: number;
		ch: number;
	}

	type TokenAttributeName =
		'childNodes'|'parentNode'| // AstNode
		'name'| // AstElement
		'stage'|'config'|'accum'|'acceptable'|'protectedChildren'| // Token
		'tags'| // ExtToken
		'keys'|'args'| // TranscludeToken
		'attr'; // AttributeToken
	type TokenAttribute<T> =
		T extends 'childNodes' ? (string|Token)[] :
		T extends 'parentNode' ? Token|undefined :
		T extends 'name'|'tag' ? string :
		T extends 'stage' ? number :
		T extends 'config' ? ParserConfig :
		T extends 'accum' ? accum :
		T extends 'acceptable' ? Record<string, Ranges> :
		T extends 'protectedChildren' ? Ranges :
		T extends 'tags' ? string[] :
		T extends 'keys' ? Set<string> :
		T extends 'args' ? Map<string, Set<ParameterToken>> :
		T extends 'attr' ? Map<string, string|true> :
		string;
}

export {};
