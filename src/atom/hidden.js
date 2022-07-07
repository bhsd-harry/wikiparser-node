'use strict';

const hidden = require('../../mixin/hidden'),
	AtomToken = require('.');

class HiddenToken extends hidden(AtomToken) {}

module.exports = HiddenToken;
