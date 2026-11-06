import {TableBaseToken} from './base';
import {
	TdToken,
} from './td';

/* NOT FOR BROWSER */

import {isToken} from '../../util/debug';
import {cached} from '../../mixin/cached';
import type {Token} from '../index';
import type {AstNodes} from '../../internal';

/* NOT FOR BROWSER END */

/**
 * table row or table
 *
 * 表格行或表格
 */
export abstract class TrBaseToken extends TableBaseToken {
	abstract override get type(): 'table' | 'tr';

	/**
	 * Get the number of rows
	 *
	 * 获取行数
	 */
	getRowCount(): number {
		return Number(this.childNodes.some(
			child => child instanceof TdToken
				&& child.isIndependent()
				&& !child.firstChild.text().endsWith('+'),
		));
	}

	/* NOT FOR BROWSER */

	/** @private */
	override removeAt(i: number): AstNodes {
		i += i < 0 ? this.length : 0;
		const child = this.childNodes[i];
		if (child instanceof TdToken && child.isIndependent()) {
			const {nextSibling} = child;
			if (nextSibling?.is('td')) {
				nextSibling.independence();
			}
		}
		return super.removeAt(i);
	}

	/**
	 * @override
	 * @param token node to be inserted / 待插入的子节点
	 * @param i position to be inserted at / 插入位置
	 */
	override insertAt<T extends Token>(token: T, i = this.length): T {
		i += i < 0 ? this.length : 0;
		const child = this.childNodes[i];
		if (token instanceof TdToken && token.isIndependent() && child instanceof TdToken) {
			child.independence();
		}
		return super.insertAt(token, i);
	}

	/** @private */
	override toHtmlOrPlain(func: HtmlOrPlainFunc, _: unknown, opt?: Omit<HtmlOpt, 'nocc'>): string {
		return func(this.childNodes.filter(isToken('td')), '', opt);
	}

	/** @private */
	@cached()
	override toHtmlInternal(opt?: Omit<HtmlOpt, 'nocc'>): string {
		const {childNodes, type} = this,
			result = super.toHtmlInternal(opt);
		return childNodes.some(node => node.is('td') && node.subtype !== 'caption')
			? `<tr${type === 'tr' ? childNodes[1].toHtmlInternal({render: opt?.render}) : ''}>${result}</tr>`
			: result;
	}
}
