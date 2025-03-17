import {attributesParent} from '../../mixin/attributesParent';
import Parser from '../../index';
import {Token} from '../index';
import {SyntaxToken} from '../syntax';
import {AttributesToken} from '../attributes';
import type {AttributesParentBase} from '../../mixin/attributesParent';

/* NOT FOR BROWSER */

import {Shadow} from '../../util/debug';
import {classes} from '../../util/constants';
import type {TdToken} from '../../internal';

/**
 * 转义表格语法
 * @param syntax 表格语法节点
 */
const escapeTable = (syntax: SyntaxToken): void => {
	const wikitext = syntax.childNodes.map(
			child => child.type === 'text'
				? child.data.replaceAll('|', '{{!}}')
				: child.toString(),
		).join(''),
		{childNodes} = Parser
			.parse(wikitext, syntax.getAttribute('include'), 2, syntax.getAttribute('config'));
	syntax.replaceChildren(...childNodes);
};

/* NOT FOR BROWSER END */

declare type TableTypes = 'table' | 'tr' | 'td';

export interface TableBaseToken extends AttributesParentBase {}

/**
 * table row that contains the newline at the beginning but not at the end
 *
 * 表格行，含开头的换行，不含结尾的换行
 * @classdesc `{childNodes: [SyntaxToken, AttributesToken, ...Token[]]}`
 */
export abstract class TableBaseToken extends attributesParent(1)(Token) {
	abstract override get type(): TableTypes;
	declare readonly childNodes: readonly [SyntaxToken, AttributesToken, ...Token[]];
	abstract override get firstChild(): SyntaxToken;
	abstract override get lastChild(): Token;

	/* NOT FOR BROWSER */

	abstract override get children(): [SyntaxToken, AttributesToken, ...Token[]];
	abstract override get firstElementChild(): SyntaxToken;
	abstract override get lastElementChild(): Token;

	/* NOT FOR BROWSER END */

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
		acceptable?: Acceptable,
	) {
		super(undefined, config, accum, acceptable);
		this.append(
			new SyntaxToken(syntax, pattern, 'table-syntax', config, accum, {
				'Stage-1': ':', '!ExtToken': '', TranscludeToken: ':',
			}),
			// @ts-expect-error abstract class
			new AttributesToken(attr, 'table-attrs', type, config, accum) as AttributesToken,
		);

		/* NOT FOR BROWSER */

		this.protectChildren(0, 1);
	}

	/* NOT FOR BROWSER */

	override cloneNode(): this {
		const [syntax, attr, ...cloned] = this.cloneChildNodes() as [SyntaxToken, AttributesToken, ...Token[]];
		return Shadow.run(() => {
			const C = this.constructor as new (...args: any[]) => this,
				token = new C(undefined, undefined, this.getAttribute('config'));
			token.firstChild.safeReplaceWith(syntax);
			token.childNodes[1].safeReplaceWith(attr);
			if (token.is<TdToken>('td')) { // TdToken
				token.childNodes[2].safeReplaceWith(cloned[0]!);
			} else {
				token.append(...cloned);
			}
			return token;
		});
	}

	override escape(): void {
		for (const child of this.childNodes) {
			if (child instanceof SyntaxToken) {
				escapeTable(child);
			} else {
				child.escape();
			}
		}
	}

	/** @private */
	setSyntax(syntax: string, esc?: boolean): void {
		const {firstChild} = this;
		firstChild.replaceChildren(syntax);
		if (esc) {
			escapeTable(firstChild);
		}
	}
}

classes['TableBaseToken'] = __filename;
