import NowikiToken = require('.');

/**
 * :
 * @classdesc `{childNodes: [AstText]}`
 */
declare class DdToken extends NowikiToken {
	override type: 'dd';

	/** 是否包含<dt> */
	get dt(): boolean;

	/** 是否包含<ul> */
	get ul(): boolean;

	/** 是否包含<ol> */
	get ol(): boolean;

	/** 缩进数 */
	get indent(): number;
	set indent(arg: number);
}

export = DdToken;
