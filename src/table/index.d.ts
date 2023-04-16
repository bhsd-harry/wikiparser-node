import Token = require('..');
import TrToken = require('./tr');
import {ParserConfig} from '../..';

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

	/**
	 * 闭合表格语法
	 * @param syntax 表格结尾语法
	 * @throws `SyntaxError` 表格的闭合部分不符合语法
	 */
	close(syntax?: string, halfParsed?: boolean): void;
}

export = TableToken;
