/* NOT FOR BROWSER ONLY */

import {mixin} from '../util/debug';

/* NOT FOR BROWSER ONLY END */

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

		/* NOT FOR BROWSER ONLY */

		mixin(NoEscapeToken, constructor);

		/* NOT FOR BROWSER ONLY END */

		return NoEscapeToken;
	}
};
