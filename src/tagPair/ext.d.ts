import TagPairToken = require('.');
import AttributesToken = require('../attributes');
import Token = require('..');
import {ParserConfig} from '../..';

/**
 * 扩展标签
 * @classdesc `{childNodes: [AttributesToken, NowikiToken|Token]}`
 */
declare class ExtToken extends TagPairToken {
	override type: 'ext';
	override childNodes: [AttributesToken, Token];
	/** @override */
	override get firstChild(): AttributesToken;
	/** @override */
	override get lastChild(): Token;
	/** @override */
	override cloneChildNodes(): [AttributesToken, Token];

	/**
	 * @param name 标签名
	 * @param attr 标签属性
	 * @param inner 内部wikitext
	 * @param closed 是否封闭
	 */
	constructor(name: string, attr?: string, inner?: string, closed?: string, config?: ParserConfig, accum?: Token[]);

	/** AttributesToken子节点 */
	get attributesChild(): AttributesToken;

	/** getAttrs()方法的getter写法 */
	get attributes(): Record<string, string|true>;

	/** 以字符串表示的class属性 */
	get className(): string;
	set className(className: string);

	/** 以Set表示的class属性 */
	get classList(): Set<string>;

	/** id属性 */
	get id(): string;
	set id(id: string);

	/**
	 * AttributesToken子节点是否具有某属性
	 * @param key 属性键
	 */
	hasAttr(key: string): boolean

	/**
	 * 获取AttributesToken子节点的属性
	 * @param key 属性键
	 */
	getAttr(key: string): string|true;

	/** 列举AttributesToken子节点的属性键 */
	getAttrNames(): Set<string>;

	/** AttributesToken子节点是否具有任意属性 */
	hasAttrs(): boolean;

	/** 获取AttributesToken子节点的全部标签属性 */
	getAttrs(): Record<string, string|true>;

	/**
	 * 对AttributesToken子节点设置属性
	 * @param key 属性键
	 * @param value 属性值
	 */
	setAttr(key: string, value: string|boolean): void;

	/**
	 * 移除AttributesToken子节点的某属性
	 * @param key 属性键
	 */
	removeAttr(key: string): void;

	/**
	 * 开关AttributesToken子节点的某属性
	 * @param key 属性键
	 * @param force 强制开启或关闭
	 */
	toggleAttr(key: string, force?: boolean): void;
}

export = ExtToken;
