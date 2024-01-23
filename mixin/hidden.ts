import type {LintError} from '../base';

/**
 * 解析后不可见的类
 * @param constructor 基类
 */
export const hidden = <T extends AstConstructor>(constructor: T) => {
	/** 解析后不可见的类 */
	abstract class AnyHiddenToken extends constructor {
		/** 没有可见部分 */
		override text(): string {
			return '';
		}

		/** @override */
		override lint(): LintError[] {
			return [];
		}
	}
	return AnyHiddenToken;
};
