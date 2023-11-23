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

	declare childNodes: [SyntaxToken, AttributesToken, ...TdToken[]];
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
}

Parser.classes['TrToken'] = __filename;
