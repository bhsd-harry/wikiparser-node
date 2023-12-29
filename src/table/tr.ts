import {classes} from '../../util/constants';
import * as Parser from '../../index';
import {TrBaseToken} from './trBase';
import type {Token, TdToken, TableToken, SyntaxToken, AttributesToken} from '../../internal';

/**
 * 表格行，含开头的换行，不含结尾的换行
 * @classdesc `{childNodes: [SyntaxToken, AttributesToken, ?Token, ...TdToken]}`
 */
// @ts-expect-error not implementing all abstract methods
export class TrToken extends TrBaseToken {
	override readonly type = 'tr';

	declare readonly childNodes: [SyntaxToken, AttributesToken, ...TdToken[]];
	// @ts-expect-error abstract method
	abstract override get children(): [SyntaxToken, AttributesToken, ...TdToken[]];
	// @ts-expect-error abstract method
	abstract override get lastChild(): AttributesToken | TdToken;
	// @ts-expect-error abstract method
	abstract override get lastElementChild(): AttributesToken | TdToken;
	// @ts-expect-error abstract method
	abstract override get parentNode(): TableToken | undefined;
	// @ts-expect-error abstract method
	abstract override get parentElement(): TableToken | undefined;
	// @ts-expect-error abstract method
	abstract override get nextSibling(): this | SyntaxToken | undefined;
	// @ts-expect-error abstract method
	abstract override get nextElementSibling(): this | SyntaxToken | undefined;
	// @ts-expect-error abstract method
	abstract override get previousSibling(): Token;
	// @ts-expect-error abstract method
	abstract override get previousElementSibling(): Token;

	/**
	 * @param syntax 表格语法
	 * @param attr 表格属性
	 */
	constructor(syntax: string, attr?: string, config = Parser.getConfig(), accum: Token[] = []) {
		super(/^\n[^\S\n]*(?:\|-+|\{\{\s*!\s*\}\}-+|\{\{\s*!-\s*\}\}-*)$/u, syntax, attr, config, accum, {
			Token: 2, SyntaxToken: 0, AttributesToken: 1, TdToken: '2:',
		});
	}

	/* NOT FOR BROWSER */

	/** @override */
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

	/** 获取下一行 */
	getNextRow(): TrToken | undefined {
		return this.#getSiblingRow((childNodes, index) => childNodes.slice(index + 1));
	}

	/** 获取前一行 */
	getPreviousRow(): TrToken | undefined {
		return this.#getSiblingRow((childNodes, index) => childNodes.slice(0, index).reverse());
	}
}

classes['TrToken'] = __filename;
