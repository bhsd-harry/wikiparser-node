'use strict';

const hidden = require('../../mixin/hidden'),
	Parser = require('../..'),
	AtomToken = require('.');

/** 不可见的节点 */
class HiddenToken extends hidden(AtomToken) {
	type = 'hidden';
}

Parser.classes.HiddenToken = __filename;
module.exports = HiddenToken;
