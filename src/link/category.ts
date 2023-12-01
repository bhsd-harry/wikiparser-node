import {LinkBaseToken} from './base';

/** 分类 */
// @ts-expect-error not implementing all abstract methods
export class CategoryToken extends LinkBaseToken {
	override readonly type = 'category';
}
