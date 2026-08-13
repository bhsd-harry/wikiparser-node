/* NOT FOR BROWSER ONLY */

import {mixin} from '../util/debug';

/* NOT FOR BROWSER ONLY END */

/* NOT FOR BROWSER */

import {mixins} from '../util/constants';

/* NOT FOR BROWSER END */

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

	/* NOT FOR BROWSER ONLY */

	mixin(GappedToken, constructor);

	/* NOT FOR BROWSER ONLY END */

	return GappedToken;
};

mixins['gapped'] = __filename;
