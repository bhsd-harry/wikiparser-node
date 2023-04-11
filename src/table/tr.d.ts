import Token = require('..');
import TdToken = require('./td');
import TableToken = require('.');
import SyntaxToken = require('../syntax');
import {ParserConfig} from '../..';

declare interface TableCoords {
	row: number;
	column: number;
	start: boolean;
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
}

declare namespace TrToken {
	export {TableCoords};
}

export = TrToken;
