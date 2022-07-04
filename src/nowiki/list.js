'use strict';

const sol = require('../../mixin/sol'),
	/** @type {Parser} */ Parser = require('../..'),
	DdToken = require('./dd');

/**
 * ;:*#
 * @classdesc `{childNodes: [string]}`
 */
class ListToken extends sol(DdToken) {
	type = 'list';
}

Parser.classes.ListToken = __filename;
module.exports = ListToken;
