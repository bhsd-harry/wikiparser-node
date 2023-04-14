import Token = require('..');
import TrToken = require('./tr');
import TdToken = require('./td');
import SyntaxToken = require('../syntax');
import {TableCoords} from './tr';
import {ParserConfig} from '../..';

declare interface TableRenderedCoords {
	x?: number;
	y?: number;
}

/** @extends {Array<TableCoords[]>} */
declare class Layout extends Array<TableCoords[]> {
	/** 打印表格布局 */
	print(): void;
}

/**
 * 表格
 * @classdesc `{childNodes: [SyntaxToken, AttributesToken, ?Token, ...TdToken, ...TrToken, ?SyntaxToken]}`
 */
declare class TableToken extends TrToken {
	override type: 'table';

	/**
	 * @param syntax 表格语法
	 * @param attr 表格属性
	 */
	constructor(syntax: string, attr?: string, config?: ParserConfig, accum?: Token[]);

	/** 表格是否闭合 */
	get closed(): boolean;
	set closed(arg: boolean);

	/**
	 * 闭合表格语法
	 * @param syntax 表格结尾语法
	 * @throws `SyntaxError` 表格的闭合部分不符合语法
	 */
	close(syntax?: string, halfParsed?: boolean): void;

	/** @override */
	override getRowCount(): number;
	/** @override */
	override getPreviousRow(): undefined;

	/** @override */
	override getNextRow(): TrToken;

	/**
	 * 获取第n行
	 * @param n 行号
	 * @param force 是否将表格自身视为第一行
	 * @param insert 是否用于判断插入新行的位置
	 * @throws `RangeError` 不存在该行
	 */
	getNthRow<T extends boolean>(
		n: number,
		force: boolean,
		insert: T,
	): T extends false ? TrToken|SyntaxToken : TrToken;

	/** 获取所有行 */
	getAllRows(): TrToken[];

	/**
	 * 获取指定坐标的单元格
	 * @param coords 表格坐标
	 */
	getNthCell(coords: TableCoords & TableRenderedCoords): TdToken;

	/**
	 * 获取表格布局
	 * @param stop 中止条件
	 */
	getLayout(stop?: TableCoords & TableRenderedCoords): Layout;

	/** 打印表格布局 */
	printLayout(): void;

	/**
	 * 转换为渲染后的表格坐标
	 * @param coord wikitext中的表格坐标
	 */
	toRenderedCoords({row, column}: TableCoords): TableRenderedCoords;

	/**
	 * 转换为wikitext中的表格坐标
	 * @param coord 渲染后的表格坐标
	 */
	toRawCoords({x, y}: TableRenderedCoords): {
        row: number;
        column: number;
        start: boolean;
    };
}
declare namespace TableToken {
    export {TableRenderedCoords};
}

export = TableToken;
