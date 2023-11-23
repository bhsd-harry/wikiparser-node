import {LinkToken} from './index';

/** 分类 */
// @ts-expect-error not implementing all abstract methods
export class CategoryToken extends LinkToken {
	override readonly type = 'category';
}
