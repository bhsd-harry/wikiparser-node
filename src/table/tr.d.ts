import Token = require('..');
import TableToken = require('.');
import SyntaxToken = require('../syntax');
import {ParserConfig} from '../..';

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
}

export = TrToken;
