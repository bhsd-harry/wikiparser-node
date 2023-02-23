'use strict';

const hidden = require('../../mixin/hidden'),
	AtomToken = require('.');

/** 不可见的节点 */
class HiddenToken extends hidden(AtomToken) {
	type = 'hidden';
}

module.exports = HiddenToken;
