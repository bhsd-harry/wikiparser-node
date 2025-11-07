import {LinkBaseToken} from './base';
import type {Title} from '../../lib/title';
import type {Token, AtomToken} from '../../internal';

/* PRINT ONLY */

import {decodeHtml} from '../../util/string';
import type {AST} from '../../base';

/* PRINT ONLY END */

/* NOT FOR BROWSER */

import {classes} from '../../util/constants';

/* NOT FOR BROWSER END */

/**
 * category
 *
 * 分类
 * @classdesc `{childNodes: [AtomToken, ?Token]}`
 */
export abstract class CategoryToken extends LinkBaseToken {
	declare readonly childNodes: readonly [AtomToken] | readonly [AtomToken, Token];
	abstract override get link(): Title;

	/* NOT FOR BROWSER */

	abstract override get children(): [AtomToken] | [AtomToken, Token];
	abstract override set link(link: string);

	/* NOT FOR BROWSER END */

	override get type(): 'category' {
		return 'category';
	}

	/* PRINT ONLY */

	/** sort key / 分类排序关键字 */
	get sortkey(): string | undefined {
		LSP: {
			const {childNodes: [, child]} = this;
			return child && decodeHtml(child.text());
		}
	}

	/* PRINT ONLY END */

	/* NOT FOR BROWSER */

	set sortkey(text) {
		this.setSortkey(text);
	}

	/* NOT FOR BROWSER END */

	/** @private */
	override json(_?: string, start = this.getAbsoluteIndex()): AST {
		LSP: {
			const json = super.json(undefined, start),
				{sortkey} = this;
			if (sortkey) {
				json['sortkey'] = sortkey;
			}
			return json;
		}
	}

	/* NOT FOR BROWSER */

	/**
	 * Set the sort key
	 *
	 * 设置排序关键字
	 * @param text sort key / 排序关键字
	 */
	setSortkey(text?: string): void {
		this.setLinkText(text);
	}
}

classes['CategoryToken'] = __filename;
