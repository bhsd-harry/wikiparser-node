import {syntax} from '../../mixin/syntax';
import * as Parser from '../../index';
import {NowikiBaseToken} from './base';

/** `;:*#` */
// @ts-expect-error not implementing all abstract methods
export class ListBaseToken extends syntax(NowikiBaseToken, /^[;:*#]+$/u) {
	declare type: 'dd' | 'list';

	/* NOT FOR BROWSER */

	/** 是否包含`;` */
	get dt(): boolean {
		return this.firstChild.data.includes(';');
	}

	/** 是否包含`*` */
	get ul(): boolean {
		return this.firstChild.data.includes('*');
	}

	/** 是否包含`#` */
	get ol(): boolean {
		return this.firstChild.data.includes('#');
	}

	/** 缩进数 */
	get indent(): number {
		return this.firstChild.data.split(':').length - 1;
	}

	set indent(indent) {
		if (this.type === 'dd') {
			this.setText(':'.repeat(indent));
		}
	}
}

Parser.classes['ListBase'] = __filename;
