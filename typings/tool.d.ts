import Token from '../src';

declare global {
	interface CollectionCallback<T, S> extends Function {
		call: (thisArg: string|Token, i: number, ele: S) => T;
	}
	type CollectionMap = (arr: Token[]) => (string|Token)[];
}

export {};
