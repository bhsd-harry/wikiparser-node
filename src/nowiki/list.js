'use strict';

const sol = require('../../mixin/sol'),
	Parser = require('../..'),
	DdToken = require('./dd');

/**
 * ;:*#
 * @classdesc `{childNodes: [AstText]}`
 */
class ListToken extends sol(DdToken) {
	type = 'list';
}

Parser.classes.ListToken = __filename;
module.exports = ListToken;
