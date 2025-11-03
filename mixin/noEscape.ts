import {mixin} from '../util/debug';

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
