import {LinkBaseToken} from './base';
import type {Title} from '../../lib/title';
import type {Token, AtomToken} from '../../internal';

/* PRINT ONLY */

import {decodeHtml} from '../../util/string';
import type {AST} from '../../base';

/* PRINT ONLY END */

/**
 * category
 *
 * 分类
 * @classdesc `{childNodes: [AtomToken, ?Token]}`
 */
export abstract class CategoryToken extends LinkBaseToken {
	declare readonly childNodes: readonly [AtomToken] | readonly [AtomToken, Token];
	abstract override get link(): Title;

	override get type(): 'category' {
		return 'category';
	}

	/* PRINT ONLY */

	/** sort key / 分类排序关键字 */
	get sortkey(): string | undefined {
		LSP: {
			const [, child] = this.childNodes;
			return child && decodeHtml(child.text());
		}
	}

	/** @private */
	override json(_?: string, depth?: number, start = this.getAbsoluteIndex()): AST {
		LSP: {
			const json = super.json(undefined, depth, start),
				{sortkey} = this;
			if (sortkey) {
				json['sortkey'] = sortkey;
			}
			return json;
		}
	}
}
