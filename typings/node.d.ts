import Ranges = require('../lib/ranges');
import Token = require('../src');
import AstText = require('../lib/text');
import ParameterToken = require('../src/parameter');
import {ParserConfig, accum} from './token';

type buildFromStr = <S extends string>(str: string, type: S) => S extends 'string'|'text' ? string : (AstText|Token)[];

export type TokenAttribute<T> =
	T extends 'stage' ? number :
	T extends 'config' ? ParserConfig :
	T extends 'accum' ? accum :
	T extends 'parentNode' ? Token|undefined :
	T extends 'childNodes' ? (AstText|Token)[] :
	T extends 'parseOnce' ? (n: number, include: boolean) => Token :
	T extends 'buildFromStr' ? buildFromStr :
	T extends 'build' ? () => void :
	T extends 'bracket'|'include' ? boolean :
	T extends 'pattern' ? RegExp :
	T extends 'tags'|'flags'|'quotes' ? string[] :
	T extends 'optional'|'keys' ? Set<string> :
	T extends 'acceptable' ? Record<string, Ranges> :
	T extends 'args' ? Record<string, Set<ParameterToken>> :
	T extends 'protectedChildren' ? Ranges :
	T extends 'verifyChild' ? (i: number, addition: number) => void :
	T extends 'matchesAttr' ? (key: string, equal: string, val: string, i: string) => boolean :
	T extends 'protectChildren' ? (...args: (string|number|Range)[]) => void :
	string;

export interface printOpt {
	pre?: string;
	post?: string;
	sep?: string;
	class?: string;
}
