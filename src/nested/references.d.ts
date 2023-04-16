import NestedToken = require('.');
import Token = require('..');
import {ParserConfig} from '../..';

/**
 * `<references>`
 * @classdesc `{childNodes: [...ExtToken|NoincludeToken|CommentToken]}`
 */
declare class ReferencesToken extends NestedToken {
	/** @override */
	constructor(wikitext: string, config?: ParserConfig, accum?: Token[]);
}

export = ReferencesToken;
