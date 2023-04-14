import Token = require('.');
import HasNowikiToken = require('./hasNowiki');
import {ParserConfig} from '..';

/**
 * `<charinsert>`
 * @classdesc `{childNodes: [...HasNowikiToken]}`
 */
declare class CharinsertToken extends Token {
	override type: 'ext-inner';
	override childNodes: HasNowikiToken[];
	/** @override */
	override get firstChild(): HasNowikiToken;
	/** @override */
	override get lastChild(): HasNowikiToken;
	/** @override */
	override cloneChildNodes(): HasNowikiToken[];

	/** @override */
	constructor(wikitext: string, config?: ParserConfig, accum?: Token[]);
	/** @override */
	override toString(selector: string): string;
	/** @override */
	override print(): string;

	/**
	 * 获取某一行的插入选项
	 * @param child 行号或子节点
	 */
	getLineItems(child: number|HasNowikiToken): (string|string[])[];

	/** 获取所有插入选项 */
	getAllItems(): (string|string[])[];
	/** @override */
	override text(): string;
}

export = CharinsertToken;
