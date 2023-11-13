import {attributesParent} from '../../mixin/attributesParent';
import Parser from '../../index';
import {Token} from '..';
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
				? String(child).replace(/\{\||\|\}|\|{1,2}/gu, p => `{{${templates[p]!}}}`)
				: String(child),
		).join(''),
		token = Parser.parse(wikitext, syntax.getAttribute('include'), 2, syntax.getAttribute('config'));
	syntax.replaceChildren(...token.childNodes);
};

/**
 * 表格行，含开头的换行，不含结尾的换行
 * @classdesc `{childNodes: [SyntaxToken, AttributesToken, ?Token, ...TdToken]}`
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
	 * @browser
	 * @param pattern 表格语法正则
	 * @param syntax 表格语法
	 * @param attr 表格属性
	 */
	constructor(
		pattern: RegExp,
		syntax?: string,
		attr = '',
		config = Parser.getConfig(),
		accum: Token[] = [],
		acceptable: Acceptable = {},
	) {
		super(undefined, config, true, accum, acceptable);
		this.append(
			new SyntaxToken(syntax, pattern, 'table-syntax', config, accum, {
				'Stage-1': ':', '!ExtToken': '', TranscludeToken: ':',
			}),
			// @ts-expect-error abstract class
			new AttributesToken(attr, 'table-attrs', this.type, config, accum) as AttributesToken,
		);
		this.protectChildren(0, 1);
	}

	/** @override */
	override cloneNode(): this {
		const [syntax, attr, ...cloned] = this.cloneChildNodes() as [SyntaxToken, AttributesToken, ...Token[]];
		return Parser.run(() => {
			const {constructor} = this as this & {constructor: new (...args: any[]) => unknown},
				token = new constructor(undefined, undefined, this.getAttribute('config')) as this;
			token.firstChild.safeReplaceWith(syntax);
			token.childNodes[1].safeReplaceWith(attr);
			if (token.type === 'td') { // TdToken
				token.childNodes[2]!.safeReplaceWith(cloned[0]!);
			} else {
				token.append(...cloned);
			}
			return token;
		});
	}

	/** 转义表格语法 */
	escape(): void {
		for (const child of this.childNodes) {
			if (child instanceof SyntaxToken) {
				escapeTable(child);
			} else if (child instanceof TableBaseToken) {
				child.escape();
			}
		}
	}

	/**
	 * 设置表格语法
	 * @param syntax 表格语法
	 * @param esc 是否需要转义
	 */
	setSyntax(syntax: string, esc = false): void {
		const {firstChild} = this;
		firstChild.replaceChildren(syntax);
		if (esc) {
			escapeTable(firstChild);
		}
	}
}

Parser.classes['TableBaseToken'] = __filename;
