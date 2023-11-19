import {LinkBaseToken} from './base';
import type {Token, AtomToken} from '../../internal';

/**
 * 内链
 * @classdesc `{childNodes: [AtomToken, ?Token]}`
 */
// @ts-expect-error not implementing all abstract methods
export class LinkToken extends LinkBaseToken {
	/** @browser */
	override readonly type: 'link' | 'category' = 'link';
	declare childNodes: [AtomToken] | [AtomToken, Token];
}
