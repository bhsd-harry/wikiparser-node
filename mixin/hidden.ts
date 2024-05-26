import {mixin} from '../util/debug';
import {mixins} from '../util/constants';
import type {LintError} from '../base';

/**
 * 解析后不可见的类
 * @param constructor 基类
 * @param _ context
 */
export const hiddenToken = <T extends AstConstructor>(constructor: T, _?: unknown): T => {
	/** 解析后不可见的类 */
	abstract class AnyHiddenToken extends constructor {
		/** 没有可见部分 */
		override text(): string {
			return '';
		}

		/** @override */
		lint(): LintError[] { // eslint-disable-line @typescript-eslint/class-methods-use-this
			return [];
		}
	}
	mixin(AnyHiddenToken, constructor);
	return AnyHiddenToken;
};

mixins['hiddenToken'] = __filename;
