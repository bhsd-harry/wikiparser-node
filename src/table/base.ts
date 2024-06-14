import {attributesParent} from '../../mixin/attributesParent';
import Parser from '../../index';
import {Token} from '../index';
import {SyntaxToken} from '../syntax';
import {AttributesToken} from '../attributes';
import type {AttributesParentBase} from '../../mixin/attributesParent';

declare type TableTypes = 'table' | 'tr' | 'td';

export interface TableBaseToken extends AttributesParentBase {}

/**
 * 表格行，含开头的换行，不含结尾的换行
 * @classdesc `{childNodes: [SyntaxToken, AttributesToken, ...Token]}`
 */
export abstract class TableBaseToken extends attributesParent(1)(Token) {
	abstract override get type(): TableTypes;
	declare readonly childNodes: readonly [SyntaxToken, AttributesToken, ...Token[]];
	abstract override get firstChild(): SyntaxToken;
	abstract override get lastChild(): Token;

	/**
	 * @param pattern 表格语法正则
	 * @param syntax 表格语法
	 * @param type 节点类型
	 * @param attr 表格属性
	 */
	constructor(
		pattern: RegExp,
		syntax: string,
		type: TableTypes,
		attr?: string,
		config = Parser.getConfig(),
		accum: Token[] = [],
		acceptable: Acceptable = {},
	) {
		super(undefined, config, accum, acceptable);
		this.append(
			new SyntaxToken(syntax, pattern, 'table-syntax', config, accum, {
			}),
			// @ts-expect-error abstract class
			new AttributesToken(attr, 'table-attrs', type, config, accum) as AttributesToken,
		);
	}
}
