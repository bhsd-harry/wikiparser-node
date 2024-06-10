/* eslint-disable @stylistic/indent */
import type {Ranges} from '../lib/ranges';
import type {Title} from '../lib/title';
import type {Config} from '../base';
import type {
	AstNodes,
	Token,
} from '../internal';

declare global {
	type TokenAttribute<T extends string> =
		T extends 'stage' | 'padding' ? number :
		T extends 'config' ? Config :
		T extends 'accum' ? Token[] :
		T extends 'parentNode' ? Token | undefined :
		T extends 'childNodes' ? AstNodes[] :
		T extends 'bracket' | 'include' | 'plain' | 'built' ? boolean :
		T extends 'title' ? Title :

		/* NOT FOR BROWSER */

		T extends 'pattern' ? RegExp :
		T extends 'tags' ? [string, string] :
		T extends 'keys' ? Set<string> :
		T extends 'protectedChildren' ? Ranges :
		T extends 'acceptable' ? Acceptable | undefined :

		/* NOT FOR BROWSER END */

		unknown;
}
