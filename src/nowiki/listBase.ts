import {NowikiBaseToken} from './base';
import type {AST} from '../../base';

/* NOT FOR BROWSER */

import {classes} from '../../util/constants';
import {Shadow, setChildNodes} from '../../util/debug';
import {AstText} from '../../lib/text';
import {Token} from '../index';
import type {DdToken, ListToken, AstNodes} from '../../internal';

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
		LSP: return this.innerText.split(':').length - 1;
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
	override json(_?: string, depth?: number, start = this.getAbsoluteIndex()): AST {
		LSP: {
			const json = super.json(undefined, depth, start),
				{indent} = this;
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
		let start: number,
			end: number,
			contents: AstNodes[];
		if (nextSibling && nextSibling.type !== 'text') {
			const {childNodes} = parentNode;
			start = childNodes.indexOf(this) + 1;
			end = childNodes.indexOf(nextSibling);
			contents = childNodes.slice(start, end);
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
			const {childNodes} = parentNode;
			start = childNodes.indexOf(this) + 1;
			if (nextSibling) {
				const {data} = nextSibling,
					offset = data.indexOf('\n'),
					text = new AstText(data.slice(0, offset));
				end = childNodes.indexOf(nextSibling);
				contents = childNodes.slice(start, end);
				const last = contents.at(-1);
				if (last) {
					last.setAttribute('nextSibling', text);
					text.setAttribute('previousSibling', last);
				}
				contents.push(text);
				nextSibling.setAttribute('data', data.slice(offset));
			} else {
				end = childNodes.length;
				contents = childNodes.slice(start);
			}
		}
		const token = Shadow.run(() => {
			const t = new Token(undefined, this.getAttribute('config'));
			t.type = 'list-range';
			return t;
		});
		token.concat(contents); // eslint-disable-line unicorn/prefer-spread
		setChildNodes(parentNode, start, end - start, [token]);
		return token as ListRangeToken;
	}

	/** @private */
	override toHtmlInternal(): string {
		return '';
	}
}

classes['ListBaseToken'] = __filename;
