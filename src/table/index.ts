import {
	Shadow,

	/* NOT FOR BROWSER */

	isToken,
} from '../../util/debug';
import {cached} from '../../mixin/cached';
import {TrBaseToken} from './trBase';
import {SyntaxToken} from '../syntax';
import type {
	Config,
} from '../../base';
import type {AttributesToken, TdToken, TrToken, Token} from '../../internal';

/* NOT FOR BROWSER */

import {
	html,
} from '../../util/html';

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
		super(
			syntax,
			'table',
			attr,
			config,
			accum,
		);
	}

	/**
	 * Close the table syntax
	 *
	 * 闭合表格语法
	 * @param syntax syntax of the table end / 表格结尾语法
	 */
	close(
		syntax = '\n|}',
	): void {
		Shadow.run(() => {
			const token = new SyntaxToken(
				syntax,
				'table-syntax',
				this.getAttribute('config'),
				this.getAttribute('accum'),
			);
			super.insertAt(token);
		});
	}

	/* NOT FOR BROWSER */

	/** @ignore */
	#toHtmlOrPlain(func: HtmlOrPlainFunc, method: Method, opt?: HtmlOpt): [[string, string, string, string], boolean] {
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
				[this, ...tr].flatMap(filter).map(token => token[method](newOpt).trim()).join(' '),
				newline,
				super[method](opt),
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
			[[inter, newline, firstRow, rows], hasTr] = this.#toHtmlOrPlain(html, 'toHtmlInternal', opt);
		return `${inter}<table${
			childNodes[1].toHtmlInternal({render: opt?.render})
		}>${newline}<tbody>${firstRow}${rows}${hasTr || firstRow ? '' : '<tr><td></td></tr>'}</tbody></table>`;
	}
}
