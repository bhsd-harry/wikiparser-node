import AtomToken = require('.');

/** 不可见的节点 */
declare class HiddenToken extends AtomToken {
	type: 'hidden';
}

export = HiddenToken;
