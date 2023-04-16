import Token = require('.');
import AtomToken = require('./atom');
import {ParserConfig} from '..';

/**
 * 转换flags
 * @classdesc `{childNodes: ...AtomToken}`
 */
declare class ConverterFlagsToken extends Token {
	override type: 'converter-flags';
	override childNodes: AtomToken[];
	/** @override */
	override get firstChild(): AtomToken;
	/** @override */
	override get lastChild(): AtomToken;

	/** @param flags 转换类型标记 */
	constructor(flags: string[], config?: ParserConfig, accum?: Token[]);
	/** @override */
	override toString(selector: string): string;
	/** @override */
	override text(): string;
	/** @override */
	override print(): string;

	/** 获取未知转换类型标记 */
	getUnknownFlags(): Set<string>;

	/** 获取指定语言变体的转换标记 */
	getVariantFlags(): Set<string>;
}

export = ConverterFlagsToken;
