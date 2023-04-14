import TrToken = require('./tr');
import Token = require('..');
import SyntaxToken = require('../syntax');
import AttributesToken = require('../attributes');
import {ParserConfig} from '../..';

declare type TdAttr = Record<string, string> & {
	rowspan?: number;
	colspan?: number;
}

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
	override cloneChildNodes(): [SyntaxToken, AttributesToken, Token];
	/** @override */
	override get nextSibling(): Token;
	/** @override */
	override get previousSibling(): Token;

	/**
	 * 创建新的单元格
	 * @param inner 内部wikitext
	 * @param subtype 单元格类型
	 * @param attr 单元格属性
	 * @param include 是否嵌入
	 * @throws `RangeError` 非法的单元格类型
	 */
	static create(
		inner: string|Token,
		subtype?: 'td'|'th'|'caption',
		attr?: TdAttr,
		include?: boolean,
		config?: ParserConfig,
	): TdToken;

	/**
	 * @param syntax 单元格语法
	 * @param inner 内部wikitext
	 */
	constructor(syntax: string, inner: string, config?: ParserConfig, accum?: Token[]);

	/** 单元格类型 */
	get subtype(): 'caption'|'td'|'th';
	set subtype(arg: 'caption'|'td'|'th');

	/** rowspan */
	get rowspan(): number;
	set rowspan(arg: number);

	/** colspan */
	get colspan(): number;
	set colspan(arg: number);

	/** 内部wikitext */
	get innerText(): string;

	/** 是否位于行首 */
	isIndependent(): boolean;

	/** 获取单元格语法信息 */
	getSyntax(): {
		subtype: 'td'|'th'|'caption';
		escape: boolean;
		correction: boolean;
	};

	/** @override */
	override print(): string;

	/**
	 * 改为独占一行
	 */
	independence(): void;

	/**
	 * 获取单元格属性
	 * @param key 属性键
	 */
	getAttr<T extends string>(key: T): T extends 'rowspan'|'colspan' ? number : string;

	/** 获取全部单元格属性 */
	getAttrs(): TdAttr;

	/**
	 * 设置单元格属性
	 * @param key 属性键
	 * @param value 属性值
	 */
	setAttr<T extends string>(key: T, value: T extends 'rowspan'|'colspan' ? number : string|boolean): boolean;
}

declare namespace TdToken {
	export {TdAttr};
}

export = TdToken;
