import {mixins} from '../util/constants';

/**
 * 不可包含换行符的类
 * @param constructor 基类
 */
export const singleLine = <T extends AstConstructor>(constructor: T): T => {
	/** 不可包含换行符的类 */
	abstract class SingleLineToken extends constructor {
		/** @private */
		override toString(omit?: Set<string>): string {
			return super.toString(omit).replace(/\n/gu, ' ');
		}

		/** @override */
		override text(): string {
			return super.text().replace(/\n/gu, ' ');
		}
	}
	Object.defineProperty(SingleLineToken, 'name', {value: `SingleLine${constructor.name}`});
	return SingleLineToken;
};

mixins['singleLine'] = __filename;
