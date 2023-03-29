import Token = require('../src');
import AstText = require('../lib/text');

export interface CollectionCallback<T, S> extends Function {
	call: (thisArg: AstText|Token, i: number, ele: S) => T;
}
