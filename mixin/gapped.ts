import {mixin} from '../util/debug';

/**
 * 给定 gap 的类
 * @param gap
 */
export const gapped = (gap = 1) => <S extends AstConstructor>(constructor: S): S => {
	/** 不可增删子节点的类 */
	abstract class GappedToken extends constructor {
		/** @private */
		getGaps(): number {
			return gap;
		}
	}
	mixin(GappedToken, constructor);
	return GappedToken;
};
