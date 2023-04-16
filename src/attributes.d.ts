import Token = require('.');
import AttributeToken = require('./attribute');
import {ParserConfig} from '..';

/**
 * 扩展和HTML标签属性
 * @classdesc `{childNodes: ...AtomToken|AttributeToken}`
 */
declare class AttributesToken extends Token {
	override childNodes: Token[];
	/** @override */
	override get firstChild(): Token;
	/** @override */
	override get lastChild(): Token;

	/**
	 * @param attr 标签属性
	 * @param type 标签类型
	 * @param name 标签名
	 */
	constructor(attr: string, type: 'ext-attrs'|'html-attrs'|'table-attrs', name: string, config?: ParserConfig, accum?: Token[]);

	override type: 'ext-attrs'|'html-attrs'|'table-attrs';

	/**
	 * 所有指定属性名的AttributeToken
	 * @param key 属性名
	 */
	getAttrTokens(key: string): AttributeToken[];

	/**
	 * 制定属性名的最后一个AttributeToken
	 * @param key 属性名
	 */
	getAttrToken(key: string): AttributeToken;

	/**
	 * 获取标签属性
	 * @param key 属性键
	 */
	getAttr(key: string): string|true;
	/** @override */
	override print(): string;
}

export = AttributesToken;
