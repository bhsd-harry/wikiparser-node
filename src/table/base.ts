import {Shadow} from '../../util/debug';
import {attributesParent} from '../../mixin/attributesParent';
import Parser from '../../index';
import {Token} from '../index';
import {SyntaxToken} from '../syntax';
import {AttributesToken} from '../attributes';
import type {Config} from '../../base';
import type {AttributesParentBase} from '../../mixin/attributesParent';

declare type TableTypes = 'table' | 'tr' | 'td';

export interface TableBaseToken extends AttributesParentBase {}

/**
 * 转义表格语法
 * @param syntax 表格语法节点
 */
const escapeTable = (syntax: SyntaxToken): void => {
	const wikitext = syntax.childNodes.map(
			child => child.type === 'text'
				? child.data.replace(/\|{1,2}/gu, ({length}) => `{{${'!'.repeat(length)}}}`)
				: child.toString(),
		).join(''),
		{childNodes} = Parser.parseWithRef(wikitext, syntax, 2);
	Shadow.run(() => {
		syntax.safeReplaceChildren(childNodes);
	});
};

/**
 * table row that contains the newline at the beginning but not at the end
 *
 * 表格行，含开头的换行，不含结尾的换行
 * @classdesc `{childNodes: [SyntaxToken, AttributesToken, ...Token[]]}`
 */
@attributesParent(1)
export abstract class TableBaseToken extends Token {
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
		syntax: string | undefined,
		type: TableTypes,
		attr?: string,
		config?: Config,
		accum: Token[] = [],
		acceptable?: WikiParserAcceptable,
	) {
		super(undefined, config, accum, acceptable);
		this.append(
			new SyntaxToken(
				syntax,
				'table-syntax',
				config,
				accum,
			),
			// @ts-expect-error abstract class
			new AttributesToken(attr, 'table-attrs', type, config, accum) as AttributesToken,
		);
	}

	override escape(): void {
		LSP: {
			for (const child of this.childNodes) {
				if (child instanceof SyntaxToken) {
					escapeTable(child);
				} else {
					child.escape();
				}
			}
		}
	}
}
