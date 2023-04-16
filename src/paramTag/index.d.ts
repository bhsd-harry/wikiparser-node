import Token = require('..');
import {ParserConfig} from '../..';

/**
 * `<inputbox>`
 * @classdesc `{childNodes: ...AtomToken}`
 */
declare class ParamTagToken extends Token {
	override type: 'ext-inner';
	override childNodes: Token[];
	/** @override */
	override get firstChild(): Token;
	/** @override */
	override get lastChild(): Token;

	/** @override */
	constructor(wikitext: string, config?: ParserConfig, accum?: Token[]);

	/** @override */
	override toString(selector: string): string;
	/** @override */
	override text(): string;
	/** @override */
	override print(): string;
}

export = ParamTagToken;
