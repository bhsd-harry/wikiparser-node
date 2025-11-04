/* eslint-disable @stylistic/indent, @stylistic/operator-linebreak */
import type {Config} from '../base';
import type {Title} from '../lib/title';
import type {
	AstNodes,
	Token,

	/* NOT FOR BROWSER */

	QuoteToken,
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
		T extends 'bracket' | 'include' | 'built' | 'invalid' ? boolean :
		T extends 'title' ? Title :

		/* NOT FOR BROWSER */

		T extends 'pattern' ? RegExp :
		T extends 'tags' ? [string, string] :
		T extends 'keys' ? Set<string> :
		T extends 'protectedChildren' ? Ranges :
		T extends 'acceptable' ? WikiParserAcceptable | undefined :
		T extends 'bold' | 'italic' ? QuoteToken :

		/* NOT FOR BROWSER END */

		string;
}
