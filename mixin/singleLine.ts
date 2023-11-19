import * as Parser from '../index';

/**
 * 不可包含换行符的类
 * @param constructor 基类
 */
// eslint-disable-next-line @typescript-eslint/explicit-function-return-type
export const singleLine = <T extends AstConstructor>(constructor: T) => {
	/** 不可包含换行符的类 */
	abstract class SingleLineToken extends constructor {
		/** @override */
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

Parser.mixins['singleLine'] = __filename;
