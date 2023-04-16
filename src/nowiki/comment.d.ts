import NowikiToken = require('.');
import Token = require('..');
import {ParserConfig} from '../..';

/**
 * HTML注释，不可见
 * @classdesc `{childNodes: [AstText]}`
 */
declare class CommentToken extends NowikiToken {
	override type: 'comment';

	/** @param closed 是否闭合 */
	constructor(wikitext: string, closed?: boolean, config?: ParserConfig, accum?: Token[]);

	closed: boolean;

	/** @override */
	override print(): string;

	/** @override */
	override toString(selector: string): string;
}

export = CommentToken;
