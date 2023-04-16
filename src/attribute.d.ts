import Token = require('.');
import {ParserConfig} from '..';

/**
 * 扩展和HTML标签属性
 * @classdesc `{childNodes: [AtomToken, Token|AtomToken]}`
 */
declare class AttributeToken extends Token {
	override childNodes: [Token, Token];
	/** @override */
	override get firstChild(): Token;
	/** @override */
	override get lastChild(): Token;

	/**
	 * @param type 标签类型
	 * @param tag 标签名
	 * @param key 属性名
	 * @param equal 等号
	 * @param value 属性值
	 * @param quotes 引号
	 */
	constructor(type: 'ext-attr'|'html-attr'|'table-attr', tag: string, key: string, equal?: string, value?: string, quotes?: string[], config?: ParserConfig, accum?: Token[]);

	/** 引号是否匹配 */
	get balanced(): boolean;

	/** getValue()的getter */
	get value(): string|true;

	/** 标签名 */
	get tag(): string;
	override type: 'ext-attr'|'html-attr'|'table-attr';
	/** @override */
	override toString(selector: string): string;
	/** @override */
	override text(): string;
	/** @override */
	override print(): string;

	/** 获取属性值 */
	getValue(): string|true;
}

export = AttributeToken;
