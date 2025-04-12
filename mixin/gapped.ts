import {mixin} from '../util/debug';

/* NOT FOR BROWSER */

import {mixins} from '../util/constants';

/* NOT FOR BROWSER END */

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

mixins['gapped'] = __filename;
