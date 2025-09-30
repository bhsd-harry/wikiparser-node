import {decodeHtml} from '../../util/string';
import {LinkBaseToken} from './base';
import type {Title} from '../../lib/title';
import type {AST} from '../../base';
import type {Token, AtomToken} from '../../internal';

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
		LSP: { // eslint-disable-line no-unused-labels
			const {childNodes: [, child]} = this;
			return child && decodeHtml(child.text());
		}
	}

	/** @private */
	override json(_?: string, start = this.getAbsoluteIndex()): AST {
		LSP: { // eslint-disable-line no-unused-labels
			const json = super.json(undefined, start),
				{sortkey} = this;
			if (sortkey) {
				json['sortkey'] = sortkey;
			}
			return json;
		}
	}
}
