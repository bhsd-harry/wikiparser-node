import TrToken = require('./tr');
import Token = require('..');
import SyntaxToken = require('../syntax');
import AttributesToken = require('../attributes');
import {ParserConfig} from '../..';

/**
 * `<td>`、`<th>`和`<caption>`
 * @classdesc `{childNodes: [SyntaxToken, AttributesToken, Token]}`
 */
declare class TdToken extends TrToken {
	override type: 'td';
	/** @override */
	override childNodes: [SyntaxToken, AttributesToken, Token];
	/** @override */
	override get firstChild(): SyntaxToken;
	/** @override */
	override get lastChild(): Token;
	/** @override */
	override get nextSibling(): Token;
	/** @override */
	override get previousSibling(): Token;

	/**
	 * @param syntax 单元格语法
	 * @param inner 内部wikitext
	 */
	constructor(syntax: string, inner: string, config?: ParserConfig, accum?: Token[]);

	/** 单元格类型 */
	get subtype(): 'caption'|'td'|'th';

	/** 获取单元格语法信息 */
	getSyntax(): {
		subtype: 'td'|'th'|'caption';
		escape: boolean;
		correction: boolean;
	};

	/** @override */
	override print(): string;
}

export = TdToken;
