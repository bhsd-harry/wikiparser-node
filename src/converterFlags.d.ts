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
	/** @override */
	override cloneChildNodes(): AtomToken[];

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

	/** 获取所有转换类型标记 */
	getAllFlags(): Set<string>;

	/**
	 * 获取转换类型标记节点
	 * @param flag 转换类型标记
	 */
	getFlagToken(flag: string): AtomToken[];

	/** 获取有效转换类型标记 */
	getEffectiveFlags(): Set<string>;

	/**
	 * 是否具有某转换类型标记
	 * @param flag 转换类型标记
	 */
	hasFlag(flag: string): boolean;

	/**
	 * 是否具有某有效转换类型标记
	 * @param flag 转换类型标记
	 */
	hasEffectiveFlag(flag: string): boolean;

	/**
	 * 移除某转换类型标记
	 * @param flag 转换类型标记
	 */
	removeFlag(flag: string): void;

	/**
	 * 设置转换类型标记
	 * @param flag 转换类型标记
	 */
	setFlag(flag: string): void;

	/**
	 * 开关转换类型标记
	 * @param flag 转换类型标记
	 */
	toggleFlag(flag: string): void;
}

export = ConverterFlagsToken;
