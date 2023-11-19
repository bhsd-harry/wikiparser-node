import type {Config} from '../index';
import type {AstNodes, Token, ParameterToken} from '../internal';

declare global {
	type TokenAttribute<T extends string> =
		T extends 'stage' ? number :
		T extends 'config' ? Config :
		T extends 'accum' ? Token[] :
		T extends 'parentNode' ? Token | undefined :
		T extends 'childNodes' ? AstNodes[] :
		T extends 'bracket' | 'include' ? boolean :
		T extends 'pattern' ? RegExp :
		T extends 'flags' ? string[] :
		T extends 'tags' ? [string, string] :
		T extends 'quotes' ? [string?, string?] :
		T extends 'optional' | 'keys' ? Set<string> :
		T extends 'args' ? Map<string, Set<ParameterToken>> :
		string;

	type TokenAttributeGetter<T extends string> =
		TokenAttribute<T>;

	type TokenAttributeSetter<T extends string> =
		TokenAttribute<T> | undefined;
}
