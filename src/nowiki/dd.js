'use strict';

const NowikiToken = require('.');

/**
 * :
 * @classdesc `{childNodes: [AstText]}`
 */
class DdToken extends NowikiToken {
	/** @type {'dd'} */ type = 'dd';
}

module.exports = DdToken;
