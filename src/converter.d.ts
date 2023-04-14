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
	/** @override */
	override cloneChildNodes(): [ConverterFlagsToken, ...ConverterRuleToken[]];

	/**
	 * @param flags 转换类型标记
	 * @param rules 转换规则
	 */
	constructor(flags: string[], rules: string[], config?: ParserConfig, accum?: Token[]);

	/** 是否无转换 */
	get noConvert(): boolean;

	/** flags */
	get flags(): Set<string>;
	/** @override */
	override toString(selector: string): string;
	/** @override */
	override text(): string;
	/** @override */
	override print(): string;

	/** 获取所有转换类型标记 */
	getAllFlags(): Set<string>;

	/** 获取有效的转换类型标记 */
	getEffectiveFlags(): Set<string>;

	/** 获取未知的转换类型标记 */
	getUnknownFlags(): Set<string>;

	/**
	 * 是否具有某转换类型标记
	 * @param flag 转换类型标记
	 */
	hasFlag(flag: string): boolean;

	/**
	 * 是否具有某有效的转换类型标记
	 * @param flag 转换类型标记
	 */
	hasEffectiveFlag(flag: string): boolean;

	/**
	 * 移除转换类型标记
	 * @param flag 转换类型标记
	 */
	removeFlag(flag: string): void;

	/**
	 * 设置转换类型标记
	 * @param flag 转换类型标记
	 */
	setFlag(flag: string): void;

	/**
	 * 开关某转换类型标记
	 * @param flag 转换类型标记
	 */
	toggleFlag(flag: string): void;
}

export = ConverterToken;
