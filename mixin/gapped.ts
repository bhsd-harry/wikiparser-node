import {mixin} from '../util/debug';

/**
 * 给定 gap 的类
 * @param gap
 */
export const gapped = (gap = 1) => <S extends AstConstructor>(constructor: S): S => {
	abstract class GappedToken extends constructor {
		getGaps(): number {
			return gap;
		}
	}
	mixin(GappedToken, constructor);
	return GappedToken;
};
