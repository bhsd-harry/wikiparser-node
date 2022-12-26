'use strict';

const NowikiToken = require('.');

/**
 * `<noinclude>`和`</noinclude>`，不可进行任何更改
 * @classdesc `{childNodes: [string]}`
 */
class NoincludeToken extends NowikiToken {
	type = 'noinclude';
}

module.exports = NoincludeToken;
