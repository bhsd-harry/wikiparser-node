import {rawurldecode} from '@bhsd/common';
import {LinkBaseToken} from './base';
import type {Title} from '../../lib/title';
import type {Token, AtomToken} from '../../internal';

/**
 * internal link
 *
 * 内链
 * @classdesc `{childNodes: [AtomToken, Token?]}`
 */
export abstract class LinkToken extends LinkBaseToken {
	declare readonly childNodes: readonly [AtomToken] | readonly [AtomToken, Token];
	abstract override get link(): Title;

	/* NOT FOR BROWSER */

	abstract override get children(): [AtomToken] | [AtomToken, Token];

	/* NOT FOR BROWSER END */

	override get type(): 'link' {
		return 'link';
	}

	/** link text / 链接显示文字 */
	get innerText(): string {
		return this.length > 1
			? this.lastChild.text()
			: rawurldecode(this.firstChild.text().replace(/^\s*:?/u, ''));
	}
}
