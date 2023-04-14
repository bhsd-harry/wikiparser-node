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
	/** @override */
	override cloneChildNodes(): Token[];

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

	/** 移除无效部分 */
	removeRedundant(): void;

	/**
	 * 设置参数名
	 * @param name 新参数名
	 * @throws `SyntaxError` 非法的参数名
	 */
	setName(name: string): void;

	/**
	 * 设置预设值
	 * @param value 预设值
	 * @throws `SyntaxError` 非法的参数预设值
	 */
	setDefault(value: string): void;
}

export = ArgToken;
