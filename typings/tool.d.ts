import Token from '../src';
import Text from '../lib/text';

declare global {
	interface CollectionCallback<T, S> extends Function {
		call: (thisArg: Text|Token, i: number, ele: S) => T;
	}
	type CollectionMap = (arr: Token[]) => (Text|Token)[];
}

export {};
