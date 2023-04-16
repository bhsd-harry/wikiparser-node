import Token = require('.');
import ConverterFlagsToken = require('./converterFlags');
import ConverterRuleToken = require('./converterRule');
import {ParserConfig} from '..';

/**
 * 转换
 * @classdesc `{childNodes: [ConverterFlagsToken, ...ConverterRuleToken]}`
 */
declare class ConverterToken extends Token {
	override type: 'converter';
	override childNodes: [ConverterFlagsToken, ...ConverterRuleToken[]];
	/** @override */
	override get firstChild(): ConverterFlagsToken;
	/** @override */
	override get lastChild(): ConverterRuleToken;

	/**
	 * @param flags 转换类型标记
	 * @param rules 转换规则
	 */
	constructor(flags: string[], rules: string[], config?: ParserConfig, accum?: Token[]);

	/** @override */
	override toString(selector: string): string;
	/** @override */
	override text(): string;
	/** @override */
	override print(): string;
}

export = ConverterToken;
