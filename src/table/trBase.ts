import {TableBaseToken} from './base';

/* NOT FOR BROWSER */

import {
	isToken,
} from '../../util/debug';
import {cached} from '../../mixin/cached';

/* NOT FOR BROWSER END */

/**
 * table row or table
 *
 * 表格行或表格
 */
export abstract class TrBaseToken extends TableBaseToken {
	abstract override get type(): 'table' | 'tr';

	/* NOT FOR BROWSER */

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
