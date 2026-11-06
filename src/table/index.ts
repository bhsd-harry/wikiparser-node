import {
	Shadow,

	/* NOT FOR BROWSER */

	isToken,
} from '../../util/debug';
import {cached} from '../../mixin/cached';
import Parser from '../../index';
import {TrBaseToken} from './trBase';
import {SyntaxToken} from '../syntax';
import type {
	Config,
} from '../../base';
import type {AttributesToken, TdToken, TrToken, Token} from '../../internal';

/* NOT FOR BROWSER */

import {html} from '../../util/html';

const closingPattern = /^\n[^\S\n]*(?:\|\}|\{\{\s*!\s*\}\}\}|\{\{\s*!\)\s*\}\})$/u;

/* NOT FOR BROWSER END */

export type TableTokens = TableToken | TrToken | TdToken;

/**
 * table
 *
 * 表格
 * @classdesc `{childNodes: [SyntaxToken, AttributesToken, ...TdToken[], ...TrToken[], SyntaxToken?]}`
 */
export abstract class TableToken extends TrBaseToken {
	declare readonly childNodes: readonly [SyntaxToken, AttributesToken, ...(TdToken | TrToken)[], SyntaxToken]
		| readonly [SyntaxToken, AttributesToken, ...(TdToken | TrToken)[]];
	abstract override get lastChild(): AttributesToken | TdToken | TrToken | SyntaxToken;

	/* NOT FOR BROWSER */

	abstract override get children(): [SyntaxToken, AttributesToken, ...(TdToken | TrToken)[], SyntaxToken]
		| [SyntaxToken, AttributesToken, ...(TdToken | TrToken)[]];

	/* NOT FOR BROWSER END */

	override get type(): 'table' {
		return 'table';
	}

	/**
	 * @param syntax 表格语法
	 * @param attr 表格属性
	 */
	constructor(syntax?: string, attr?: string, config?: Config, accum?: Token[]) {
		super(/^(?:\{\||\{\{\{\s*!\s*\}\}|\{\{\s*\(!\s*\}\})$/u, syntax, 'table', attr, config, accum, {
			Token: 2, SyntaxToken: [0, -1], AttributesToken: 1, TdToken: '2:', TrToken: '2:',
		});
	}

	/**
	 * Close the table syntax
	 *
	 * 闭合表格语法
	 * @param syntax syntax of the table end / 表格结尾语法
	 */
	close(syntax = '\n|}'): void {
		if (!this.lastChild.is('table-syntax')) {
			Shadow.run(() => {
				const token = new SyntaxToken(
					syntax,
					closingPattern,
					'table-syntax',
					this.getAttribute('config'),
					this.getAttribute('accum'),
					{'Stage-1': ':', '!ExtToken': '', TranscludeToken: ':'},
				);
				super.insertAt(token);
			});
		}
	}

	/* NOT FOR BROWSER */

	/**
	 * @override
	 * @param token node to be inserted / 待插入的子节点
	 * @param i position to be inserted at / 插入位置
	 * @throws `SyntaxError` if the closing syntax of the table is invalid
	 */
	override insertAt<T extends Token>(token: T, i = this.length): T {
		i += i < 0 ? this.length : 0;
		const previous = this.childNodes[i - 1];
		if (typeof token !== 'string' && token.is('td') && previous?.is('tr')) {
			Parser.warn('The table cell is inserted into the current row instead.');
			return previous.insertAt(token);
		}
		return super.insertAt(token, i);
	}

	/** @private */
	override getRowCount(): number {
		return super.getRowCount()
			+ this.childNodes.filter(child => child.is('tr') && child.getRowCount()).length;
	}

	/** @ignore */
	#toHtmlOrPlain(func: HtmlOrPlainFunc, opt?: HtmlOpt): [[string, string, string, string], boolean] {
		/**
		 * 过滤需要移出表格的节点
		 * @param token 表格或表格行
		 */
		const filter = (token: TrBaseToken): Token[] => token.childNodes.filter(isToken('table-inter'));
		const {childNodes} = this,
			tr = childNodes.filter(isToken('tr')),
			hasTr = tr.length > 0,
			newOpt = {
				...opt,
				nowrap: true,
			},
			newline = opt?.nowrap ? ' ' : '\n';
		return [
			[
				[this, ...tr].flatMap(filter).map(token => token.toHtmlInternal(newOpt).trim()).join(' '),
				newline,
				super.toHtmlInternal(opt),
				(hasTr && childNodes.some(node => node.is('td') && node.subtype !== 'caption') ? newline : '')
				+ func(tr, newline, opt),
			],
			hasTr,
		];
	}

	/** @private */
	@cached()
	override toHtmlInternal(opt?: Omit<HtmlOpt, 'nocc'>): string {
		const {childNodes} = this,
			[[inter, newline, firstRow, rows], hasTr] = this.#toHtmlOrPlain(html, opt);
		return `${inter}<table${
			childNodes[1].toHtmlInternal({render: opt?.render})
		}>${newline}<tbody>${firstRow}${rows}${hasTr || firstRow ? '' : '<tr><td></td></tr>'}</tbody></table>`;
	}
}
