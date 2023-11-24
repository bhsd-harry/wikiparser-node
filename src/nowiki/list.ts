import {sol} from '../../mixin/sol';
import * as Parser from '../../index';
import {ListBaseToken} from './listBase';
import type {AstRange} from '../../lib/range';

/** 位于行首的`;:*#` */
// @ts-expect-error not implementing all abstract methods
export class ListToken extends sol(ListBaseToken) {
	override readonly type = 'list';

	/* NOT FOR BROWSER */

	/** 获取列表行的范围 */
	getRange(): AstRange {
		const range = this.createRange();
		range.setStartBefore(this);
		let {nextSibling} = this;
		while (nextSibling && (nextSibling.type !== 'text' || !nextSibling.data.includes('\n'))) {
			({nextSibling} = nextSibling);
		}
		if (nextSibling) {
			const i = nextSibling.data.indexOf('\n');
			range.setEnd(nextSibling, i);
		} else {
			range.setEndAfter(this.parentNode!);
		}
		return range;
	}
}

Parser.classes['ListToken'] = __filename;
