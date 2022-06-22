'use strict';

const hidden = require('../../mixin/hidden'),
	/** @type {Parser} */ Parser = require('../..'),
	AtomToken = require('.');

class HiddenToken extends hidden(AtomToken) {}

Parser.classes.HiddenToken = __filename;
module.exports = HiddenToken;
