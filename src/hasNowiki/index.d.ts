import Token = require('..');
import {ParserConfig} from '../..';

/**
 * `<pre>`
 * @classdesc `{childNodes: [...AstText|NoincludeToken]}`
 */
declare class HasNowikiToken extends Token {
	/** @override */
	constructor(wikitext: string, type: 'ext-inner', config?: ParserConfig, accum?: Token[]);
}

export = HasNowikiToken;
