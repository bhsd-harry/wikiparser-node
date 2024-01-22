import {classes} from '../../util/constants';
import {sol} from '../../mixin/sol';
import {ListBaseToken} from './listBase';
import type {AstRange} from '../../lib/range';
import type {SolTokenBase} from '../../mixin/sol';

/** 位于行首的`;:*#` */
// @ts-expect-error not implementing all abstract methods
export class ListToken extends sol(ListBaseToken) implements SolTokenBase {
	override readonly type = 'list';

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
		let {nextSibling} = this;
		while (nextSibling && (nextSibling.type !== 'text' || !nextSibling.data.includes('\n'))) {
			({nextSibling} = nextSibling);
		}
		if (nextSibling) {
			const i = nextSibling.data.indexOf('\n');
			range.setEnd(nextSibling, i);
		} else {
			const {parentNode} = this;
			range.setEnd(parentNode!, parentNode!.length);
		}
		return range;
	}
}

classes['ListToken'] = __filename;
