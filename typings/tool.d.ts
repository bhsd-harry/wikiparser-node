import Token = require('../src');
import AstText = require('../lib/text');

declare global {
	interface CollectionCallback<T, S> extends Function {
		call: (thisArg: AstText|Token, i: number, ele: S) => T;
	}
}

export {};
