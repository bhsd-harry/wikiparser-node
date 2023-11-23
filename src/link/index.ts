import * as Parser from '../../index';
import {LinkBaseToken} from './base';
import type {Title} from '../../lib/title';
import type {Token, AtomToken} from '../../internal';

/**
 * 内链
 * @classdesc `{childNodes: [AtomToken, ?Token]}`
 */
// @ts-expect-error not implementing all abstract methods
export class LinkToken extends LinkBaseToken {
	override readonly type: 'link' | 'category' = 'link';

	declare childNodes: [AtomToken] | [AtomToken, Token];
	// @ts-expect-error abstract method
	abstract override get children(): [AtomToken] | [AtomToken, Token];
	// @ts-expect-error abstract method
	abstract override get link(): Title;
	// @ts-expect-error abstract method
	abstract override set link(link);
}

Parser.classes['LinkToken'] = __filename;
