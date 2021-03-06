import Ranges from '../lib/ranges';
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
		T extends 'acceptable' ? Record<string, Ranges> :
		T extends 'protectedChildren' ? Ranges :
		T extends 'keys' ? Set<string> :
		T extends 'args' ? Record<string, Set<ParameterToken>> :
		T extends 'attr' ? Map<string, string|true> :
		T extends 'include'|'selfLink'|'ul'|'ol'|'dt'|'unidirectional'|'bidirectional' ? boolean :
		T extends 'pattern' ? RegExp :
		string;
}

export {};
