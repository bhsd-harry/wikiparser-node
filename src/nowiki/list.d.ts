import DdToken = require('./dd');

/**
 * ;:*#
 * @classdesc `{childNodes: [AstText]}`
 */
declare class ListToken extends DdToken {
	override type: 'list';
}

export = ListToken;
