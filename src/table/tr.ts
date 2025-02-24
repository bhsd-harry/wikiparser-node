import {TrBaseToken} from './trBase';
import type {Config} from '../../base';
import type {Token, TdToken, TableToken, SyntaxToken, AttributesToken} from '../../internal';

/* NOT FOR BROWSER */

import {classes} from '../../util/constants';

/* NOT FOR BROWSER END */

/**
 * table row that contains the newline at the beginning but not at the end
 *
 * 表格行，含开头的换行，不含结尾的换行
 * @classdesc `{childNodes: [SyntaxToken, AttributesToken, ?Token, ...TdToken[]]}`
 */
export abstract class TrToken extends TrBaseToken {
	declare readonly childNodes: readonly [SyntaxToken, AttributesToken, ...TdToken[]];
	abstract override get lastChild(): AttributesToken | TdToken;
	abstract override get parentNode(): TableToken | undefined;
	abstract override get nextSibling(): this | SyntaxToken | undefined;
	abstract override get previousSibling(): Token;

	/* NOT FOR BROWSER */

	abstract override get children(): [SyntaxToken, AttributesToken, ...TdToken[]];
	abstract override get lastElementChild(): AttributesToken | TdToken;
	abstract override get parentElement(): TableToken | undefined;
	abstract override get nextElementSibling(): this | SyntaxToken | undefined;
	abstract override get previousElementSibling(): Token;

	/* NOT FOR BROWSER END */

	override get type(): 'tr' {
		return 'tr';
	}

	/**
	 * @param syntax 表格语法
	 * @param attr 表格属性
	 */
	constructor(syntax: string, attr?: string, config?: Config, accum?: Token[]) {
		super(
			/^\n[^\S\n]*(?:\|-+|\{\{\s*!\s*\}\}-+|\{\{\s*!-\s*\}\}-*)$/u,
			syntax,
			'tr',
			attr,
			config,
			accum,
			{Token: 2, SyntaxToken: 0, AttributesToken: 1, TdToken: '2:'},
		);
	}

	/* NOT FOR BROWSER */

	/** @private */
	override text(): string {
		const str = super.text();
		return str.trim().includes('\n') ? str : '';
	}

	/**
	 * 获取相邻行
	 * @param subset 筛选兄弟节点的方法
	 */
	#getSiblingRow(subset: (childNodes: readonly Token[], index: number) => Token[]): TrToken | undefined {
		const {parentNode} = this;
		if (!parentNode) {
			return undefined;
		}
		const {childNodes} = parentNode,
			index = childNodes.indexOf(this);
		for (const child of subset(childNodes, index)) {
			if (child instanceof TrToken && child.getRowCount()) {
				return child;
			}
		}
		return undefined;
	}

	/**
	 * Get the next row
	 *
	 * 获取下一行
	 */
	getNextRow(): TrToken | undefined {
		return this.#getSiblingRow((childNodes, index) => childNodes.slice(index + 1));
	}

	/**
	 * Get the previous row
	 *
	 * 获取前一行
	 */
	getPreviousRow(): TrToken | undefined {
		return this.#getSiblingRow((childNodes, index) => childNodes.slice(0, index).reverse());
	}
}

classes['TrToken'] = __filename;
