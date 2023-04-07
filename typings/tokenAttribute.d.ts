import Config = require('./config');
import Token = require('../src');
import Ranges = require('../lib/ranges');
import AstNodeTypes = require('./node');

type Acceptable = Record<string, number|string|Ranges|(number|string)[]>;

type TokenAttribute<T extends string> =
	T extends 'stage' ? number :
	T extends 'config' ? Config :
	T extends 'accum' ? Token[] :
	T extends 'parentNode' ? Token|undefined :
	T extends 'childNodes' ? AstNodeTypes[] :
	T extends 'bracket'|'include' ? boolean :
	T extends 'pattern' ? RegExp :
	T extends 'tags'|'flags'|'quotes' ? string[] :
	T extends 'optional'|'keys' ? Set<string> :
	T extends 'args' ? Record<string, Set<ParameterToken>> :
	T extends 'protectedChildren' ? Ranges :
	string;

type TokenAttributeGetter<T extends string> =
	T extends 'acceptable' ? Record<string, Ranges>|undefined : TokenAttribute<T>;

type TokenAttributeSetter<T extends string> =
	T extends 'acceptable' ? Acceptable|undefined : TokenAttribute<T>;

export {
	Acceptable,
	TokenAttributeGetter,
	TokenAttributeSetter,
};
