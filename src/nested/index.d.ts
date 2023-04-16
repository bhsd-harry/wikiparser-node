import Token = require('..');
import {ParserConfig} from '../..';

/**
 * 嵌套式的扩展标签
 * @classdesc `{childNodes: [...ExtToken|NoincludeToken|CommentToken]}`
 */
declare class NestedToken extends Token {
	override type: 'ext-inner';
	override childNodes: Token[];
	/** @override */
	override get firstChild(): Token;
	/** @override */
	override get lastChild(): Token;

	/**
	 * @param regex 内层正则
	 * @param tags 内层标签名
	 */
	constructor(wikitext: string, regex: RegExp, tags: string[], config?: ParserConfig, accum?: Token[]);
}

export = NestedToken;
