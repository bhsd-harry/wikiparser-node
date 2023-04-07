import AstText = require('../lib/text');
import AstNodeTypes = require('./node');

type Inserted = string|AstNodeTypes;

type InsertionReturn<T extends Inserted> = T extends string ? AstText : T;

export {
	Inserted,
	InsertionReturn,
};
