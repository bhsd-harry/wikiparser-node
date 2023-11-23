import {attributesParent} from '../../mixin/attributesParent';
import * as Parser from '../../index';
import {Token} from '../index';
import {SyntaxToken} from '../syntax';
import {AttributesToken} from '../attributes';

/**
 * 转义表格语法
 * @param syntax 表格语法节点
 */
const escapeTable = (syntax: SyntaxToken): void => {
	const templates: Record<string, string> = {'{|': '(!', '|}': '!)', '||': '!!', '|': '!'},
		wikitext = syntax.childNodes.map(
			child => child.type === 'text'
				? child.data.replace(/\{\||\|\}|\|{1,2}/gu, p => `{{${templates[p]!}}}`)
				: String(child),
		).join(''),
		token = Parser.parse(wikitext, syntax.getAttribute('include'), 2, syntax.getAttribute('config'));
	syntax.replaceChildren(...token.childNodes);
};

/**
 * 表格行，含开头的换行，不含结尾的换行
 * @classdesc `{childNodes: [SyntaxToken, AttributesToken, ...Token]}`
 */
export abstract class TableBaseToken extends attributesParent(Token, 1) {
	declare type: 'table' | 'tr' | 'td';

	declare childNodes: [SyntaxToken, AttributesToken, ...Token[]];
	abstract override get children(): [SyntaxToken, AttributesToken, ...Token[]];
	abstract override get firstChild(): SyntaxToken;
	abstract override get firstElementChild(): SyntaxToken;
	abstract override get lastChild(): Token;
	abstract override get lastElementChild(): Token;

	/**
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
		super(undefined, config, accum, acceptable);
		this.append(
			new SyntaxToken(syntax, pattern, 'table-syntax', config, accum, {
				'Stage-1': ':', '!ExtToken': '', TranscludeToken: ':',
			}),
			new AttributesToken(attr, 'table-attrs', this.type, config, accum),
		);
		this.protectChildren(0, 1);
	}
}

Parser.classes['TableBaseToken'] = __filename;
