import Token = require('..');
import TdToken = require('./td');
import TableToken = require('.');
import SyntaxToken = require('../syntax');
import AttributesToken = require('../attributes');
import {ParserConfig} from '../..';

declare interface TableCoords {
	row?: number;
	column?: number;
	start?: boolean;
}

/**
 * 表格行，含开头的换行，不含结尾的换行
 * @classdesc `{childNodes: [SyntaxToken, AttributesToken, ?Token, ...TdToken]}`
 */
declare class TrToken extends Token {
	override type: 'tr'|'table'|'td';
	override childNodes: [SyntaxToken, ...Token[]];
	/** @override */
	override get parentNode(): TableToken;
	/** @override */
	override get firstChild(): SyntaxToken;
	/** @override */
	override get lastChild(): Token;
	/** @override */
	override cloneChildNodes(): [SyntaxToken, ...Token[]];

	/**
	 * @param syntax 表格语法
	 * @param attr 表格属性
	 * @param pattern 表格语法正则
	 */
	constructor(syntax: string, attr?: string, config?: ParserConfig, accum?: Token[], pattern?: RegExp);
	/** @override */
	override text(): string;

	/** @override */
	override toString(selector: string): string;

	/** 转义表格语法 */
	escape(): void;

	/**
	 * 设置表格语法
	 * @param syntax 表格语法
	 * @param esc 是否需要转义
	 */
	setSyntax(syntax: string, esc?: boolean): void;

	/** 获取行数 */
	getRowCount(): number;

	/** 获取下一行 */
	getNextRow(): TrToken;

	/** 获取前一行 */
	getPreviousRow(): TrToken;

	/** 获取列数 */
	getColCount(): number;

	/**
	 * 获取第n列
	 * @param n 列号
	 * @param insert 是否用于判断插入新列的位置
	 * @throws `RangeError` 不存在对应单元格
	 */
	getNthCol(n: number, insert?: boolean): TdToken|TrToken|SyntaxToken;

	/**
	 * 插入新的单元格
	 * @param inner 单元格内部wikitext
	 * @param coord 单元格坐标
	 * @param subtype 单元格类型
	 * @param attr 单元格属性
	 */
	insertTableCell(
		inner: string|Token,
		{column}: TableCoords,
		subtype?: 'td'|'th'|'caption',
		attr?: Record<string, string>
	): TdToken;

	/** AttributesToken子节点 */
	get attributesChild(): AttributesToken;

	/** getAttrs()方法的getter写法 */
	get attributes(): Record<string, string>;

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
	getAttr(key: string): string;

	/** 列举AttributesToken子节点的属性键 */
	getAttrNames(): Set<string>;

	/** AttributesToken子节点是否具有任意属性 */
	hasAttrs(): boolean;

	/** 获取AttributesToken子节点的全部标签属性 */
	getAttrs(): Record<string, string>;

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

declare namespace TrToken {
	export {TableCoords};
}

export = TrToken;
