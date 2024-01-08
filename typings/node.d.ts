import type {Title} from '../lib/title';
import type {Config} from '../base';
import type {AstNodes, Token, ParameterToken} from '../internal';

declare global {
	/* eslint-disable @stylistic/indent */
	type TokenAttribute<T extends string> =
		T extends 'stage' | 'padding' ? number :
		T extends 'config' ? Config :
		T extends 'accum' ? Token[] :
		T extends 'parentNode' ? Token | undefined :
		T extends 'childNodes' ? AstNodes[] :
		T extends 'bracket' | 'include' | 'plain' ? boolean :
		T extends 'pattern' ? RegExp :
		T extends 'flags' ? string[] :
		T extends 'tags' ? [string, string] :
		T extends 'quotes' ? [string?, string?] :
		T extends 'optional' | 'keys' ? Set<string> :
		T extends 'args' ? Map<string, Set<ParameterToken>> :
		T extends 'title' ? Title :
		string;
	/* eslint-enable @stylistic/indent */

	type TokenAttributeGetter<T extends string> =
		TokenAttribute<T>;

	type TokenAttributeSetter<T extends string> =
		TokenAttribute<T> | undefined;
}
