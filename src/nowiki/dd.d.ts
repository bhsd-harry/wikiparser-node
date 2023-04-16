import NowikiToken = require('.');

/**
 * :
 * @classdesc `{childNodes: [AstText]}`
 */
declare class DdToken extends NowikiToken {
	override type: 'dd'|'list';
}

export = DdToken;
