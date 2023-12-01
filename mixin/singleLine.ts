import {Shadow} from '../util/debug';

/**
 * 不可包含换行符的类
 * @param constructor 基类
 */
export const singleLine = <T extends AstConstructor>(constructor: T) => {
	/** 不可包含换行符的类 */
	abstract class SingleLineToken extends constructor {
		/** @private */
		override toString(omit?: Set<string>): string {
			return super.toString(omit).replaceAll('\n', ' ');
		}

		/** @override */
		override text(): string {
			return super.text().replaceAll('\n', ' ');
		}
	}
	Object.defineProperty(SingleLineToken, 'name', {value: `SingleLine${constructor.name}`});
	return SingleLineToken;
};

Shadow.mixins['singleLine'] = __filename;
