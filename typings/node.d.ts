/* eslint-disable @stylistic/indent */
import type {Config} from '../base';
import type {Title} from '../lib/title';
import type {
	AstNodes,
	Token,

	/* NOT FOR BROWSER */

	QuoteToken,
} from '../internal';

declare global {
	type TokenAttribute<T extends string> =
		T extends 'stage' ? number :
		T extends 'config' ? Config :
		T extends 'accum' ? Token[] :
		T extends 'parentNode' ? Token | undefined :
		T extends 'nextSibling' | 'previousSibling' ? AstNodes | undefined :
		T extends 'childNodes' ? AstNodes[] :
		T extends 'bracket' | 'include' | 'built' ? boolean :
		T extends 'title' ? Title :

		/* NOT FOR BROWSER */

		T extends 'pattern' ? RegExp :
		T extends 'tags' | 'quotes' ? [string, string] :
		T extends 'keys' ? Set<string> :
		T extends 'acceptable' ? WikiParserAcceptable | undefined :
		T extends 'bold' | 'italic' ? QuoteToken :

		/* NOT FOR BROWSER END */

		string;
}
