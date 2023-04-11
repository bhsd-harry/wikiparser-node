import NowikiToken = require('.');
import Token = require('..');
import {ParserConfig} from '../..';

/**
 * `<hr>`
 * @classdesc `{childNodes: [AstText]}`
 */
declare class HrToken extends NowikiToken {
	override type: 'hr';

	/** @param n 字符串长度 */
	constructor(n: number, config?: ParserConfig, accum?: Token[]);
}

export = HrToken;
