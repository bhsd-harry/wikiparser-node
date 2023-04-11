import NowikiToken = require('.');
import Token = require('..');
import {ParserConfig} from '../..';

/**
 * `<hr>`
 * @classdesc `{childNodes: [AstText]}`
 */
declare class QuoteToken extends NowikiToken {
	override type: 'quote';

	/** @param n 字符串长度 */
	constructor(n: number, config?: ParserConfig, accum?: Token[]);
}

export = QuoteToken;
