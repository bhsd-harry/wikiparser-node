import {LinkBaseToken} from './base';
import type {Title} from '../../lib/title';
import type {Token, AtomToken} from '../../internal';

/* NOT FOR BROWSER */

import {decodeHtml} from '../../util/string';
import {classes} from '../../util/constants';

/* NOT FOR BROWSER END */

/**
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

	/* NOT FOR BROWSER */

	/** 分类排序关键字 */
	get sortkey(): string | undefined {
		const {childNodes: [, child]} = this;
		return child && decodeHtml(child.text());
	}

	set sortkey(text) {
		this.setSortkey(text);
	}

	/**
	 * 设置排序关键字
	 * @param text 排序关键字
	 */
	setSortkey(text?: string): void {
		this.setLinkText(text);
	}
}

classes['CategoryToken'] = __filename;
