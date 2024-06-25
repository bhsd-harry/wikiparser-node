import {classes} from '../../util/constants';
import {syntax} from '../../mixin/syntax';
import {NowikiBaseToken} from './base';
import type {AstRange} from '../../lib/range';
import type {AstText, DdToken} from '../../internal';

export const list = new Map([['#', ['ol', 'li']], ['*', ['ul', 'li']], [';', ['dl', 'dt']], [':', ['dl', 'dd']]]);

/** `;:*#` */
@syntax(/^[;:*#]+$/u)
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
		let nDt = this.dt ? this.innerText.split(';').length - 2 : 0;
		range.setStartBefore(this);
		let {nextSibling} = this;
		while (nextSibling && (nextSibling.type !== 'text' || !nextSibling.data.includes('\n'))) {
			if (nextSibling.type === 'dd') {
				nDt -= (nextSibling as DdToken).indent;
			}
			if (nDt < 0) {
				break;
			}
			({nextSibling} = nextSibling);
		}
		if (nextSibling) {
			if (nDt < 0) {
				range.setEndBefore(nextSibling);
			} else {
				const i = (nextSibling as AstText).data.indexOf('\n');
				range.setEnd(nextSibling, i);
			}
		} else {
			const {parentNode} = this;
			range.setEnd(parentNode!, parentNode!.length);
		}
		return range;
	}

	/** @private */
	override toHtml(): string {
		return [...this.firstChild.data].map(ch => list.get(ch)!.map(name => `<${name}>`).join('')).join('');
	}
}

classes['ListBase'] = __filename;
