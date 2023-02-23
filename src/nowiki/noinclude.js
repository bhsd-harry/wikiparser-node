'use strict';

const hidden = require('../../mixin/hidden'),
	NowikiToken = require('.');

/**
 * `<noinclude>`和`</noinclude>`，不可进行任何更改
 * @classdesc `{childNodes: [AstText]}`
 */
class NoincludeToken extends hidden(NowikiToken) {
	type = 'noinclude';
}

module.exports = NoincludeToken;
