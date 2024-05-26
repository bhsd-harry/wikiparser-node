import {mixin} from '../util/debug';
import {mixins} from '../util/constants';

/**
 * 不可包含换行符的类
 * @param constructor 基类
 * @param _ context
 */
export const singleLine = <T extends AstConstructor>(constructor: T, _?: unknown): T => {
	/** 不可包含换行符的类 */
	abstract class SingleLineToken extends constructor {
		/** @private */
		override toString(): string {
			return super.toString().replace(/\n/gu, ' ');
		}

		/** @override */
		override text(): string {
			return super.text().replace(/\n/gu, ' ');
		}
	}
	mixin(SingleLineToken, constructor);
	return SingleLineToken;
};

mixins['singleLine'] = __filename;
