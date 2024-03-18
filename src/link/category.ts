import {LinkBaseToken} from './base';
import type {Token, AtomToken} from '../../internal';

/**
 * 分类
 * @classdesc `{childNodes: [AtomToken, ?Token]}`
 */
export abstract class CategoryToken extends LinkBaseToken {
	override readonly type = 'category';

	declare readonly childNodes: readonly [AtomToken] | readonly [AtomToken, Token];
}
