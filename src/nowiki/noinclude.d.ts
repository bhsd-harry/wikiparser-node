import NowikiToken = require('.');

/**
 * `<noinclude>`和`</noinclude>`，不可进行任何更改
 * @classdesc `{childNodes: [AstText]}`
 */
declare class NoincludeToken extends NowikiToken {
	override type: 'noinclude';
}

export = NoincludeToken;
