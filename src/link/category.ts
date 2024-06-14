import {LinkBaseToken} from './base';
import type {Token, AtomToken} from '../../internal';

/**
 * 分类
 * @classdesc `{childNodes: [AtomToken, ?Token]}`
 */
export abstract class CategoryToken extends LinkBaseToken {
	declare readonly childNodes: readonly [AtomToken] | readonly [AtomToken, Token];

	override get type(): 'category' {
		return 'category';
	}
}
