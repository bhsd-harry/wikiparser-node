import Ranges from '../lib/ranges';
import Token from '../src';
import ParameterToken from '../src/parameter';

declare global {
	type TokenAttribute<T> =
		T extends 'childNodes' ? (string|Token)[] :
		T extends 'parentNode' ? Token|undefined :
		T extends 'optional'|'tags' ? string[] :
		T extends 'stage' ? number :
		T extends 'config' ? ParserConfig :
		T extends 'accum' ? accum :
		T extends 'acceptable' ? Record<string, Ranges> :
		T extends 'protectedChildren' ? Ranges :
		T extends 'keys' ? Set<string> :
		T extends 'args' ? Map<string, Set<ParameterToken>> :
		T extends 'attr' ? Map<string, string|true> :
		T extends 'include'|'selfLink' ? boolean :
		string;
}

export {};
