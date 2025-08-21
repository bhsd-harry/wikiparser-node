import {NowikiBaseToken} from './base';
import type {AST} from '../../base';

/* NOT FOR BROWSER */

import {classes} from '../../util/constants';
import {Shadow, setChildNodes} from '../../util/debug';
import {Token} from '../index';
import type {DdToken, ListToken, AstText} from '../../internal';

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

	/* PRINT ONLY */

	/**
	 * number of indentation
	 *
	 * 缩进数
	 * @since v1.16.5
	 */
	get indent(): number {
		LSP: return this.innerText.split(':').length - 1; // eslint-disable-line no-unused-labels
	}

	/* PRINT ONLY END */

	/* NOT FOR BROWSER */

	/** @throws `Error` not `<dd>` only */
	set indent(indent) {
		if (/[^:]/u.test(this.innerText)) {
			throw new Error('The token is not <dd>!');
		}
		this.setText(':'.repeat(indent));
	}

	/** whether to contain `:` / 是否包含`:` */
	get dd(): boolean {
		return this.innerText.includes(':');
	}

	/** whether to contain `;` / 是否包含`;` */
	get dt(): boolean {
		return this.innerText.includes(';');
	}

	/** whether to contain `*` / 是否包含`*` */
	get ul(): boolean {
		return this.innerText.includes('*');
	}

	/** whether to contain `#` / 是否包含`#` */
	get ol(): boolean {
		return this.innerText.includes('#');
	}

	/* NOT FOR BROWSER END */

	/** @private */
	override json(_?: string, start = this.getAbsoluteIndex()): AST {
		const json = super.json(undefined, start);
		LSP: { // eslint-disable-line no-unused-labels
			const {indent} = this;
			if (indent) {
				json['indent'] = indent;
			}
			return json;
		}
	}

	/* NOT FOR BROWSER */

	/**
	 * Get the range of the list
	 *
	 * 获取列表行的范围
	 * @throws `Error` 不存在父节点
	 */
	getRange(): ListRangeToken {
		const {parentNode} = this;
		if (!parentNode) {
			throw new Error('There is no parent node!');
		}
		let {nextSibling} = this;
		if (nextSibling?.is<ListRangeToken>('list-range')) {
			return nextSibling;
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
			} else if (nextSibling.is<DdToken>('dd')) {
				break;
			}
			({nextSibling} = nextSibling);
		}
		const range = this.createRange();
		if (nextSibling && nextSibling.type !== 'text') {
			range.setStartAfter(this);
			range.setEndBefore(nextSibling);
		} else {
			if (type === 'list') {
				while (this.previousSibling?.is<ListToken>('list')) {
					this.setText(this.previousSibling.innerText + this.innerText);
					this.previousSibling.remove();
				}
				for (let i = 0; i < nDt; i++) {
					const token = this.nextSibling as ListToken;
					this.setText(this.innerText + token.innerText);
					token.remove();
				}
				if (parentNode.is<ListRangeToken>('list-range')) {
					parentNode.previousSibling.setText(parentNode.previousSibling.innerText + this.innerText);
					this.remove();
					return parentNode;
				}
			}
			range.setStartAfter(this);
			if (nextSibling) {
				range.setEnd(nextSibling, nextSibling.data.indexOf('\n'));
			} else {
				range.setEnd(parentNode, parentNode.length);
			}
		}
		const token = Shadow.run(() => {
			const t = new Token(undefined, this.getAttribute('config'));
			t.type = 'list-range';
			return t;
		});
		token.concat(range.extractContents()); // eslint-disable-line unicorn/prefer-spread
		setChildNodes(parentNode, parentNode.childNodes.indexOf(this) + 1, 0, [token]);
		return token as ListRangeToken;
	}

	/** @private */
	override toHtmlInternal(): string {
		return '';
	}
}

classes['ListBaseToken'] = __filename;
