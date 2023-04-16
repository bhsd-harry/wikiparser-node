import NestedToken = require('.');
import Token = require('..');
import {ParserConfig} from '../..';

/**
 * `<combobox>`
 * @classdesc `{childNodes: [...ExtToken|NoincludeToken]}`
 */
declare class ComboboxToken extends NestedToken {
	/** @override */
	constructor(wikitext: string, config?: ParserConfig, accum?: Token[]);
}

export = ComboboxToken;
