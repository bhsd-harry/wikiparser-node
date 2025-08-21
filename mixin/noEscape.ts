import {mixin} from '../util/debug';

/* NOT FOR BROWSER */

import {mixins} from '../util/constants';

/* NOT FOR BROWSER END */

/**
 * 不需要转义的类
 * @ignore
 */
export const noEscape = <T extends AstConstructor>(constructor: T): T => {
	LSP: { // eslint-disable-line no-unused-labels
		/* eslint-disable jsdoc/require-jsdoc */
		abstract class NoEscapeToken extends constructor {
			escape(): void { // eslint-disable-line @typescript-eslint/class-methods-use-this
				//
			}
		}
		/* eslint-enable jsdoc/require-jsdoc */
		mixin(NoEscapeToken, constructor);
		return NoEscapeToken;
	}
};

mixins['noEscape'] = __filename;
