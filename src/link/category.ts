import {LinkBaseToken} from './base';
import type {Title} from '../../lib/title';
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
}
