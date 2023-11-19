import Parser from '../../index';
import {Token} from '..';
import {SyntaxToken} from '../syntax';
import {AttributesToken} from '../attributes';

/**
 * 表格行，含开头的换行，不含结尾的换行
 * @classdesc `{childNodes: [SyntaxToken, AttributesToken, ?Token, ...TdToken]}`
 */
export abstract class TableBaseToken extends Token {
	declare type: 'table' | 'tr' | 'td';
	declare childNodes: [SyntaxToken, AttributesToken, ...Token[]];
	abstract override get firstChild(): SyntaxToken;
	abstract override get lastChild(): Token;

	/**
	 * @browser
	 * @param pattern 表格语法正则
	 * @param syntax 表格语法
	 * @param attr 表格属性
	 */
	constructor(
		pattern: RegExp,
		syntax?: string,
		attr?: string,
		config = Parser.getConfig(),
		accum: Token[] = [],
		acceptable: Acceptable = {},
	) {
		super(undefined, config, true, accum, acceptable);
		this.append(
			new SyntaxToken(syntax, pattern, 'table-syntax', config, accum, {
			}),
			new AttributesToken(attr, 'table-attrs', this.type, config, accum),
		);
	}
}
