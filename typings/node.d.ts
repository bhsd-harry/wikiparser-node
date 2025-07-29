/* eslint-disable @stylistic/indent */
import type {Config} from '../base';
import type {
	AstNodes,
	Token,
} from '../internal';

declare global {
	type TokenAttribute<T extends string> =
		T extends 'stage' ? number :
		T extends 'config' ? Config :
		T extends 'parentNode' ? Token | undefined :
		T extends 'nextSibling' | 'previousSibling' ? AstNodes | undefined :
		T extends 'childNodes' ? AstNodes[] :
		T extends 'built' ? boolean :
		string;
}
