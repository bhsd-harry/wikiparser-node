import {mixin} from '../util/debug';
import {mixins} from '../util/constants';
import type {LintError} from '../base';

/**
 * 解析后不可见的类
 * @param linter 是否覆写 lint 方法
 * @param html 是否覆写 toHtml 方法
 * @param constructor 基类
 * @param _ context
 */
export const hiddenToken = (
	linter = true,
	html = true,
) => <T extends AstConstructor>(constructor: T, _?: unknown): T => {
	/** 解析后不可见的类 */
	abstract class AnyHiddenToken extends constructor {
		/** 没有可见部分 */
		override text(): string {
			return '';
		}

		override lint(start?: number): LintError[] {
			// @ts-expect-error private argument
			return linter ? [] : super.lint(start);
		}

		/* NOT FOR BROWSER */

		/** @private */
		dispatchEvent(): void { // eslint-disable-line @typescript-eslint/class-methods-use-this
			//
		}

		override toHtml(): string {
			return html ? '' : super.toHtml();
		}
	}
	mixin(AnyHiddenToken, constructor);
	return AnyHiddenToken;
};

mixins['hiddenToken'] = __filename;
