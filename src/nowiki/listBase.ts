import {NowikiBaseToken} from './base';
import type {AST} from '../../base';

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

	/** @private */
	override json(_?: string, start = this.getAbsoluteIndex()): AST {
		LSP: {
			const json = super.json(undefined, start),
				{indent} = this;
			if (indent) {
				json['indent'] = indent;
			}
			return json;
		}
	}
}
