/* eslint-disable @stylistic/indent */
import type {Config} from '../base';
import type {Title} from '../lib/title';
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
		unknown;
}
