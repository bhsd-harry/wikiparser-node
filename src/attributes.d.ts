import Token = require('.');
import AttributeToken = require('./attribute');
import AtomToken = require('./atom');
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
	/** @override */
	override cloneChildNodes(): Token[];

	/**
	 * @param attr 标签属性
	 * @param type 标签类型
	 * @param name 标签名
	 */
	constructor(attr: string, type: 'ext-attrs'|'html-attrs'|'table-attrs', name: string, config?: ParserConfig, accum?: Token[]);

	/** getAttrs()方法的getter写法 */
	get attributes(): Record<string, string|true>;

	/** 以字符串表示的class属性 */
	get className(): string;
	set className(arg: string);

	/** 以Set表示的class属性 */
	get classList(): Set<string>;

	/** id属性 */
	get id(): string;
	set id(arg: string);

	/** 是否含有无效属性 */
	get sanitized(): boolean;
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

	/** 清理标签属性 */
	sanitize(): void;

	/** 所有无效属性 */
	getDirtyAttrs(): AtomToken[];

	/**
	 * 设置标签属性
	 * @param key 属性键
	 * @param value 属性值
	 * @throws `RangeError` 扩展标签属性不能包含">"
	 * @throws `RangeError` 无效的属性名
	 */
	setAttr(key: string, value: string|boolean): void;

	/**
	 * 标签是否具有某属性
	 * @param key 属性键
	 */
	hasAttr(key: string): boolean;

	/** 获取全部的标签属性名 */
	getAttrNames(): Set<string>;

	/** 标签是否具有任意属性 */
	hasAttrs(): boolean;

	/** 获取全部标签属性 */
	getAttrs(): {
		[k: string]: string|boolean;
	};

	/**
	 * 移除标签属性
	 * @param key 属性键
	 */
	removeAttr(key: string): void;

	/**
	 * 开关标签属性
	 * @param key 属性键
	 * @param force 强制开启或关闭
	 * @throws `RangeError` 不为Boolean类型的属性值
	 */
	toggleAttr(key: string, force: boolean): void;
	/** @override */
	override toString(selector: string): string;
	/** @override */
	override text(): string;
}

export = AttributesToken;
