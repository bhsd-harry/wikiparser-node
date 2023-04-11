import NestedToken = require('.');
import Token = require('..');
import {ParserConfig} from '../..';

/**
 * `<choose>`
 * @classdesc `{childNodes: [...ExtToken|NoincludeToken]}`
 */
declare class ChooseToken extends NestedToken {
	/** @override */
	constructor(wikitext: string, config?: ParserConfig, accum?: Token[]);
}

export = ChooseToken;
