import {LinkBaseToken} from './base';

/** 分类 */
export abstract class CategoryToken extends LinkBaseToken {
	override readonly type = 'category';
}
