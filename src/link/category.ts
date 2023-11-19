import {LinkToken} from '.';

/** 分类 */
// @ts-expect-error not implementing all abstract methods
export class CategoryToken extends LinkToken {
	/** @browser */
	override readonly type = 'category';
}
