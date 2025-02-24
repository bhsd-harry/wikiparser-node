import {TrBaseToken} from './trBase';
import type {Config} from '../../base';
import type {Token, TdToken, TableToken, SyntaxToken, AttributesToken} from '../../internal';

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
		);
	}
}
