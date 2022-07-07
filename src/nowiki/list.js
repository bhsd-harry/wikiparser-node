'use strict';

const DdToken = require('./dd');

/**
 * ;:*#
 * @classdesc `{childNodes: [string]}`
 */
class ListToken extends DdToken {
	type = 'list';
}

module.exports = ListToken;
