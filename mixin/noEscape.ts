import {mixin} from '../util/debug';
import {mixins} from '../util/constants';

/**
 * 不需要转义的类
 * @ignore
 */
export const noEscape = <T extends AstConstructor>(constructor: T, _?: unknown): T => {
	/** 不可包含换行符的类 */
	abstract class NoEscapeToken extends constructor {
		/** @private */
		escape(): void { // eslint-disable-line @typescript-eslint/class-methods-use-this
			//
		}
	}
	mixin(NoEscapeToken, constructor);
	return NoEscapeToken;
};

mixins['noEscape'] = __filename;
