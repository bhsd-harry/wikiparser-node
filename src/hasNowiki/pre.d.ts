import HasNowikiToken = require('.');
import Token = require('..');
import {ParserConfig} from '../..';

/**
 * `<pre>`
 * @classdesc `{childNodes: [...AstText|NoincludeToken|ConverterToken]}`
 */
declare class PreToken extends HasNowikiToken {
	override type: 'ext-inner';

	/** @override */
	constructor(wikitext: string, config?: ParserConfig, accum?: Token[]);
}

export = PreToken;
