import {mixin} from '../util/debug';
import {mixins} from '../util/constants';
import type {LintError} from '../base';

/**
 * 解析后不可见的类
 * @param linter 是否覆写 lint 方法
 * @param constructor 基类
 * @param _ context
 */
export const hiddenToken = (linter?: boolean) => <T extends AstConstructor>(constructor: T, _?: unknown): T => {
	/** 解析后不可见的类 */
	abstract class AnyHiddenToken extends constructor {
		/** 没有可见部分 */
		override text(): string {
			return '';
		}

		/** @private */
		override lint(start?: number): LintError[] {
			// @ts-expect-error private argument
			return linter ? [] : super.lint(start);
		}
	}
	mixin(AnyHiddenToken, constructor);
	return AnyHiddenToken;
};

mixins['hiddenToken'] = __filename;
