import {classes} from '../../util/constants';
import {Shadow} from '../../util/debug';
import {NowikiBaseToken} from './base';
import {Token} from '../index';
import type {DdToken, ListToken, AstText} from '../../internal';

/* NOT FOR BROWSER */

export interface ListRangeToken extends Token {
	readonly type: 'list-range';
	readonly previousSibling: ListToken | DdToken;
	readonly nextSibling: DdToken | AstText | undefined;
	readonly previousElementSibling: ListToken | DdToken;
}

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
	getRange(): ListRangeToken {
		let {nextSibling} = this;
		if (nextSibling?.type === 'list-range') {
			return nextSibling as ListRangeToken;
		}
		const {dt, type} = this;
		let nDt = 0;
		while (nextSibling && (nextSibling.type !== 'text' || !nextSibling.data.includes('\n'))) {
			if (type === 'list') {
				if (nextSibling.is<DdToken>('dd')) {
					nDt -= nextSibling.indent;
					if (dt && nDt < 0) {
						break;
					}
				} else if (nextSibling.is<ListToken>('list') && nextSibling.dt) {
					nDt++;
				}
			} else if (nextSibling.type === 'dd') {
				break;
			}
			({nextSibling} = nextSibling);
		}
		const range = this.createRange();
		if (nextSibling && nextSibling.type !== 'text') {
			range.setStartAfter(this);
			range.setEndBefore(nextSibling);
		} else {
			while (this.previousSibling?.is<ListToken>('list')) {
				this.setText(this.previousSibling.innerText + this.innerText);
				this.previousSibling.remove();
			}
			for (let i = 0; i < nDt; i++) {
				const token = this.nextSibling as ListToken;
				this.setText(this.innerText + token.innerText);
				token.remove();
			}
			range.setStartAfter(this);
			if (nextSibling) {
				range.setEnd(nextSibling, nextSibling.data.indexOf('\n'));
			} else {
				const {parentNode} = this;
				range.setEnd(parentNode!, parentNode!.length);
			}
		}
		const token = Shadow.run(() => {
			const t = new Token(undefined, this.getAttribute('config'));
			t.type = 'list-range';
			return t;
		});
		token.append(...range.extractContents());
		range.insertNode(token);
		return token as ListRangeToken;
	}

	/** @private */
	override toHtmlInternal(): string {
		return '';
	}
}

classes['ListBase'] = __filename;
