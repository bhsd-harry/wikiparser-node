import Ranges from '../lib/ranges';
import Token from '../src';
import AstText from '../lib/text';
import ParameterToken from '../src/parameter';

declare global {
	type TokenAttribute<T> =
		T extends 'childNodes' ? (AstText|Token)[] :
		T extends 'parentNode' ? Token|undefined :
		T extends 'optional'|'tags'|'flags' ? string[] :
		T extends 'stage' ? number :
		T extends 'config' ? ParserConfig :
		T extends 'accum' ? accum :
		T extends 'acceptable' ? Record<string, Ranges> :
		T extends 'protectedChildren' ? Ranges :
		T extends 'keys' ? Set<string> :
		T extends 'args' ? Record<string, Set<ParameterToken>> :
		T extends 'attr' ? Map<string, string|true> :
		T extends 'include' ? boolean :
		T extends 'pattern' ? RegExp :
		string;
}

export {};
