import {classes} from '../../util/constants';
import {NowikiBaseToken} from './base';
import type {AstRange} from '../../lib/range';
import type {DdToken, ListToken} from '../../internal';

/* NOT FOR BROWSER */

export const list = new Map([
	['#', ['ol', 'li']],
	['*', ['ul', 'li']],
	[';', ['dl', 'dt']],
	[':', ['dl', 'dd']],
]);

/* NOT FOR BROWSER END */

/** `;:*#` */
export abstract class ListBaseToken extends NowikiBaseToken {
	abstract override get type(): 'dd' | 'list';

	/* NOT FOR BROWSER */

	/** 是否包含`:` */
	get dd(): boolean {
		return this.innerText.includes(':');
	}

	/** 是否包含`;` */
	get dt(): boolean {
		return this.innerText.includes(';');
	}

	/** 是否包含`*` */
	get ul(): boolean {
		return this.innerText.includes('*');
	}

	/** 是否包含`#` */
	get ol(): boolean {
		return this.innerText.includes('#');
	}

	/** 获取列表行的范围 */
	getRange(): AstRange {
		const range = this.createRange();
		range.setStartBefore(this);
		const {dt, type} = this;
		let {nextSibling} = this,
			nDt = dt ? 1 : Infinity;
		while (nextSibling && (nextSibling.type !== 'text' || !nextSibling.data.includes('\n'))) {
			if (dt) {
				if (nextSibling.is<DdToken>('dd')) {
					nDt -= nextSibling.indent;
					if (nDt <= 0) {
						break;
					}
				} else if (nextSibling.is<ListToken>('list') && nextSibling.dt) {
					nDt++;
				}
			} else if (type === 'dd' && nextSibling.type === 'dd') {
				break;
			}
			({nextSibling} = nextSibling);
		}
		if (!nextSibling) {
			const {parentNode} = this;
			range.setEnd(parentNode!, parentNode!.length);
		} else if (nextSibling.type === 'text') {
			const i = nextSibling.data.indexOf('\n');
			range.setEnd(nextSibling, i);
		} else {
			range.setEndBefore(nextSibling);
		}
		return range;
	}

	/** @private */
	override toHtml(): string {
		return [...this.firstChild.data].map(ch => list.get(ch)?.map(name => `<${name}>`).join('') ?? '').join('');
	}
}

classes['ListBase'] = __filename;
