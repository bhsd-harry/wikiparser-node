import Token from '../src';
import AstText from '../lib/text';

declare global {
	type TokenAttribute<T> =
		T extends 'stage' ? number :
		T extends 'config' ? ParserConfig :
		T extends 'accum' ? accum :
		T extends 'parentNode' ? Token|undefined :
		T extends 'childNodes' ? (AstText|Token)[] :
		T extends 'parseOnce' ? (n: number, include: boolean) => Token :
		T extends 'buildFromStr' ? (str: string) => (AstText|Token)[] :
		string;

	interface printOpt {
		pre?: string;
		post?: string;
		sep?: string;
		class?: string;
	}
}

export {};
