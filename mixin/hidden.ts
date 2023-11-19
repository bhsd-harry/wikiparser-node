import * as Parser from '../index';

/**
 * 解析后不可见的类
 * @param constructor 基类
 */
// eslint-disable-next-line @typescript-eslint/explicit-function-return-type
export const hidden = <T extends AstConstructor>(constructor: T) => {
	/** 解析后不可见的类 */
	abstract class AnyHiddenToken extends constructor {
		static readonly hidden = true;

		/** 没有可见部分 */
		// eslint-disable-next-line class-methods-use-this
		override text(): string {
			return '';
		}
	}
	return AnyHiddenToken;
};

Parser.mixins['hidden'] = __filename;
