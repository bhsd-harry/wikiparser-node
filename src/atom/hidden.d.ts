import AtomToken = require('.');

/** 不可见的节点 */
declare class HiddenToken extends AtomToken {
	override type: 'hidden';
}

export = HiddenToken;
