import TagPairToken = require('.');
import Token = require('..');
import AstText = require('../../lib/text');
import {ParserConfig} from '../..';

/**
 * `<includeonly>`或`<noinclude>`
 * @classdesc `{childNodes: [AstText, AstText]}`
 */
declare class IncludeToken extends TagPairToken {
	override type: 'include';
	override childNodes: [AstText, AstText];
	/** @override */
	override get firstChild(): AstText;
	/** @override */
	override get lastChild(): AstText;
	/** @override */
	override cloneChildNodes(): [AstText, AstText];

	/**
	 * @param name 标签名
	 * @param attr 标签属性
	 * @param inner 内部wikitext
	 * @param closed 是否封闭
	 */
	constructor(name: string, attr?: string, inner?: string, closed?: string, config?: ParserConfig, accum?: Token[]);

	/**
	 * @override
	 * @param str 新文本
	 */
	override setText(str: string): string;

	/** 清除标签属性 */
	removeAttr(): void;
}

export = IncludeToken;
