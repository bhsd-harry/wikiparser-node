import {LinkToken} from '.';

/** 分类 */
export abstract class CategoryToken extends LinkToken {
	/** @browser */
	override readonly type = 'category';
}
