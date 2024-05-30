/* eslint-disable @stylistic/indent */
import type {Ranges} from '../lib/ranges';
import type {Title} from '../lib/title';
import type {Config} from '../base';
import type {
	AstNodes,
	Token,

	/* NOT FOR BROWSER */

	ParameterToken,
} from '../internal';

declare global {
	type TokenAttribute<T extends string> =
		T extends 'stage' | 'padding' ? number :
		T extends 'config' ? Config :
		T extends 'accum' ? Token[] :
		T extends 'parentNode' ? Token | undefined :
		T extends 'childNodes' ? AstNodes[] :
		T extends 'bracket' | 'include' | 'plain' ? boolean :
		T extends 'title' ? Title :

		/* NOT FOR BROWSER */

		T extends 'pattern' ? RegExp :
		T extends 'flags' ? string[] :
		T extends 'tags' ? [string, string] :
		T extends 'quotes' ? [string?, string?] :
		T extends 'optional' | 'keys' ? Set<string> :
		T extends 'args' ? Map<string, Set<ParameterToken>> :
		T extends 'protectedChildren' ? Ranges :
		T extends 'acceptable' ? Acceptable | undefined :

		/* NOT FOR BROWSER END */

		unknown;
}
