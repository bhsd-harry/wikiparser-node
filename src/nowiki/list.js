'use strict';
const sol = require('../../mixin/sol');
const Parser = require('../../index');
const DdToken = require('./dd');

/** 位于行首的`;:*#` */
class ListToken extends sol(DdToken) {
	/** @browser */
	type = 'list';
}
Parser.classes.ListToken = __filename;
module.exports = ListToken;
