import Token = require('.');
import {ParserConfig} from '..';

/**
 * `{{{}}}`包裹的参数
 * @classdesc `{childNodes: [AtomToken, ?Token, ...HiddenToken]}`
 */
declare class ArgToken extends Token {
	override type: 'arg';
	override childNodes: Token[];
	/** @override */
	override get firstChild(): Token;
	/** @override */
	override get lastChild(): Token;

	/** @param parts 以'|'分隔的各部分 */
	constructor(parts: string[], config?: ParserConfig, accum?: Token[]);

	/** default */
	get default(): string|false;
	/** @override */
	override toString(selector: string): string;
	/** @override */
	override text(): string;
	/** @override */
	override print(): string;
}

export = ArgToken;
