'use strict';

const DdToken = require('./dd');

/**
 * ;:*#
 * @classdesc `{childNodes: [AstText]}`
 */
class ListToken extends DdToken {
	/** @type {'list'} */ type = 'list';
}

module.exports = ListToken;
