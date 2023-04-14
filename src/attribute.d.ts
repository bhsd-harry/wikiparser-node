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
	/** @override */
	override cloneChildNodes(): [Token, Token];

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
	set value(arg: string|true);

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

	/** 转义等号 */
	escape(): void;

	/** 闭合引号 */
	close(): void;

	/**
	 * 设置属性值
	 * @param value 参数值
	 * @throws `SyntaxError` 非法的标签属性
	 */
	setValue(value: string|boolean): void;

	/**
	 * 修改属性名
	 * @param key 新属性名
	 * @throws `Error` title属性不能更名
	 * @throws `SyntaxError` 非法的模板参数名
	 */
	rename(key: string): void;
}

export = AttributeToken;
