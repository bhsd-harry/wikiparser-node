'use strict';

const AtomToken = require('.');

/** 不可见的节点 */
class HiddenToken extends AtomToken {
	type = 'hidden';
}

module.exports = HiddenToken;
