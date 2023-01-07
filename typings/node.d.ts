import Ranges from '../lib/ranges';
import Token from '../src';
import AstText from '../lib/text';
import ParameterToken from '../src/parameter';

declare global {
	type TokenAttribute<T> =
		T extends 'stage' ? number :
		T extends 'include' ? boolean :
		T extends 'pattern' ? RegExp :
		T extends 'optional'|'tags'|'flags' ? string[] :
		T extends 'keys' ? Set<string> :
		T extends 'attr' ? Map<string, string|true> :
		T extends 'acceptable' ? Record<string, Ranges> :
		T extends 'args' ? Record<string, Set<ParameterToken>> :
		T extends 'config' ? ParserConfig :
		T extends 'accum' ? accum :
		T extends 'protectedChildren' ? Ranges :
		T extends 'parentNode' ? Token|undefined :
		T extends 'childNodes' ? (AstText|Token)[] :
		T extends 'verifyChild' ? (i: number, addition: number) => void :
		T extends 'matchesAttr' ? (key: string, equal: string, val: string, i: string) => boolean :
		string;
}

export {};
