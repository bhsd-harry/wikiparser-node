import {LinkBaseToken} from './base';
import type {Title} from '../../lib/title';
import type {Token, AtomToken} from '../../internal';

/* NOT FOR BROWSER */

import {states} from '../../util/constants';
import {cached} from '../../mixin/cached';

/* NOT FOR BROWSER END */

/**
 * category
 *
 * 分类
 * @classdesc `{childNodes: [AtomToken, Token?]}`
 */
export abstract class CategoryToken extends LinkBaseToken {
	declare readonly childNodes: readonly [AtomToken] | readonly [AtomToken, Token];
	abstract override get link(): Title;

	/* NOT FOR BROWSER */

	abstract override get children(): [AtomToken] | [AtomToken, Token];

	/* NOT FOR BROWSER END */

	override get type(): 'category' {
		return 'category';
	}

	/* NOT FOR BROWSER */

	/**
	 * link text
	 *
	 * 链接显示文字
	 * @since v1.32.0
	 */
	get innerText(): string {
		return this.link.main;
	}

	/** @private */
	@cached()
	override toHtmlInternal({render = {}}: HtmlOpt = {}): string {
		const {cats = true} = render;
		if (cats) {
			states.get(this.getRootNode())?.categories.add(super.toHtmlInternal());
		}
		return '';
	}
}
