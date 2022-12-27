import Token from '../src';
import ParameterToken from '../src/parameter';

declare global {
	type TokenAttribute<T> =
		T extends 'childNodes' ? (string|Token)[] :
		T extends 'parentNode' ? Token|undefined :
		T extends 'optional'|'tags'|'flags' ? string[] :
		T extends 'stage'|'indent' ? number :
		T extends 'config' ? ParserConfig :
		T extends 'accum' ? accum :
		T extends 'keys' ? Set<string> :
		T extends 'args' ? Record<string, Set<ParameterToken>> :
		T extends 'attr' ? Map<string, string|true> :
		T extends 'include'|'selfLink'|'ul'|'ol'|'dt'|'unidirectional'|'bidirectional' ? boolean :
		T extends 'pattern' ? RegExp :
		string;

	interface printOpt {
		pre?: string;
		post?: string;
		sep?: string;
		class?: string;
		wrap?: (s: string) => string;
	} 
}

export {};
