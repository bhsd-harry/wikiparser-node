import {mixin} from '../util/debug';

/* NOT FOR BROWSER */

import {mixins} from '../util/constants';

/* NOT FOR BROWSER END */

/**
 * 不需要转义的类
 * @ignore
 */
export const noEscape = <T extends AstConstructor>(constructor: T): T => {
	LSP: {
		abstract class NoEscapeToken extends constructor {
			escape(): void {
				//
			}
		}
		mixin(NoEscapeToken, constructor);
		return NoEscapeToken;
	}
};

mixins['noEscape'] = __filename;
