import Ranges from '../lib/ranges';
import Token from '../src';
import AstText from '../lib/text';
import ParameterToken from '../src/parameter';

declare global {
	type TokenAttribute<T> =
		T extends 'stage' ? number :
		T extends 'config' ? ParserConfig :
		T extends 'accum' ? accum :
		T extends 'parentNode' ? Token|undefined :
		T extends 'childNodes' ? (AstText|Token)[] :
		T extends 'parseOnce' ? (n: number, include: boolean) => Token :
		T extends 'buildFromStr' ? (str: string) => (AstText|Token)[] :
		T extends 'build' ? () => void :
		T extends 'bracket'|'include' ? boolean :
		T extends 'pattern' ? RegExp :
		T extends 'optional'|'tags'|'flags' ? string[] :
		T extends 'keys' ? Set<string> :
		T extends 'attr' ? Map<string, string|true> :
		T extends 'acceptable' ? Record<string, Ranges> :
		T extends 'args' ? Record<string, Set<ParameterToken>> :
		T extends 'protectedChildren' ? Ranges :
		T extends 'verifyChild' ? (i: number, addition: number) => void :
		T extends 'matchesAttr' ? (key: string, equal: string, val: string, i: string) => boolean :
		T extends 'protectChildren' ? (...args: string|number|Range) => void :
		string;

	interface printOpt {
		pre?: string;
		post?: string;
		sep?: string;
		class?: string;
	}
}

export {};
