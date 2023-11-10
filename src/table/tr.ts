import {Parser} from '../../index';
import {TrBaseToken} from './trBase';
import type {Token} from '..';
import type {TdToken} from './td';
import type {SyntaxToken} from '../syntax';
import type {AttributesToken} from '../attributes';

/**
 * 表格行，含开头的换行，不含结尾的换行
 * @classdesc `{childNodes: [SyntaxToken, AttributesToken, ?Token, ...TdToken]}`
 */
export abstract class TrToken extends TrBaseToken {
	/** @browser */
	override readonly type = 'tr';
	declare childNodes: [SyntaxToken, AttributesToken, ...TdToken[]];
	abstract override get children(): [SyntaxToken, AttributesToken, ...TdToken[]];
	abstract override get lastChild(): AttributesToken | TdToken;
	abstract override get lastElementChild(): AttributesToken | TdToken;
	abstract override get parentNode(): TrBaseToken | undefined;
	abstract override get parentElement(): TrBaseToken | undefined;
	abstract override get nextSibling(): this | SyntaxToken | undefined;
	abstract override get nextElementSibling(): this | SyntaxToken | undefined;
	abstract override get previousSibling(): Token;
	abstract override get previousElementSibling(): Token;

	/**
	 * @browser
	 * @param syntax 表格语法
	 * @param attr 表格属性
	 */
	constructor(syntax: string, attr = '', config = Parser.getConfig(), accum: Token[] = []) {
		super(/^\n[^\S\n]*(?:\|-+|\{\{\s*!\s*\}\}-+|\{\{\s*!-\s*\}\}-*)$/u, syntax, attr, config, accum, {
			Token: 2, SyntaxToken: 0, AttributesToken: 1, TdToken: '2:',
		});
	}

	/**
	 * 获取相邻行
	 * @param subset 筛选兄弟节点的方法
	 */
	#getSiblingRow(subset: (childNodes: Token[], index: number) => Token[]): TrToken | undefined {
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

Parser.classes['TrToken'] = __filename;
