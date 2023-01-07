import Token from '../src';
import AstText from '../lib/text';

declare global {
	interface CollectionCallback<T, S> extends Function {
		call: (thisArg: AstText|Token, i: number, ele: S) => T;
	}
	type CollectionMap = (arr: Token[]) => (AstText|Token)[];
}

export {};
