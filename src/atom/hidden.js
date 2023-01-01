'use strict';

const hidden = require('../../mixin/hidden'),
	/** @type {Parser} */ Parser = require('../..'),
	AtomToken = require('.');

/** 不可见的节点 */
class HiddenToken extends hidden(AtomToken) {}

Parser.classes.HiddenToken = __filename;
module.exports = HiddenToken;
