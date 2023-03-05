import Token from '../src';
import AstText from '../lib/text';

declare global {
	type buildFromStr
		= <S extends string>(str: string, type: S) => S extends 'string'|'text' ? string : (AstText|Token)[];

	type TokenAttribute<T> =
		T extends 'stage' ? number :
		T extends 'config' ? ParserConfig :
		T extends 'accum' ? accum :
		T extends 'parentNode' ? Token|undefined :
		T extends 'parseOnce' ? (n: number, include: boolean) => Token :
		T extends 'buildFromStr' ? buildFromStr :
		T extends 'build' ? () => void :
		T extends 'bracket' ? boolean :
		string;

	interface printOpt {
		pre?: string;
		post?: string;
		sep?: string;
		class?: string;
	}
}

export {};
