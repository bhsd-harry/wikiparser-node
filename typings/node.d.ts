/* eslint-disable @stylistic/indent */
import type {Config} from '../base';
import type {Title} from '../lib/title';
import type {
	AstNodes,
	Token,
} from '../internal';

/* NOT FOR BROWSER */

import type {Ranges} from '../lib/ranges';

/* NOT FOR BROWSER END */

declare global {
	type TokenAttribute<T extends string> =
		T extends 'stage' | 'padding' | 'aIndex' ? number :
		T extends 'config' ? Config :
		T extends 'accum' ? Token[] :
		T extends 'parentNode' ? Token | undefined :
		T extends 'nextSibling' | 'previousSibling' ? AstNodes | undefined :
		T extends 'childNodes' ? AstNodes[] :
		T extends 'bracket' | 'include' | 'plain' | 'built' ? boolean :
		T extends 'title' ? Title :
		T extends 'colon' ? string :

		/* NOT FOR BROWSER */

		T extends 'pattern' ? RegExp :
		T extends 'tags' ? [string, string] :
		T extends 'keys' ? Set<string> :
		T extends 'protectedChildren' ? Ranges :
		T extends 'acceptable' ? Acceptable | undefined :

		/* NOT FOR BROWSER END */

		unknown;
}
