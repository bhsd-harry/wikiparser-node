import {mixin} from '../util/debug';
import type {LintError} from '../base';

/* NOT FOR BROWSER */

import {mixins} from '../util/constants';
import {cached} from './cached';

/* NOT FOR BROWSER END */

/**
 * 解析后不可见的类
 * @param linter 是否覆写 lint 方法
 * @param html 是否覆写 toHtml 方法
 */
export const hiddenToken = (linter = true, html = true) => <T extends AstConstructor>(constructor: T): T => {
	/* eslint-disable jsdoc/require-jsdoc */
	abstract class AnyHiddenToken extends constructor {
		override text(): string {
			return '';
		}

		override lint(start?: number): LintError[] {
			// @ts-expect-error private argument
			LINT: return linter ? [] : super.lint(start); // eslint-disable-line no-unused-labels
		}

		/* NOT FOR BROWSER */

		dispatchEvent(): void { // eslint-disable-line @typescript-eslint/class-methods-use-this
			//
		}

		@cached()
		override toHtmlInternal(opt?: HtmlOpt): string {
			return html ? '' : super.toHtmlInternal(opt);
		}
	}
	/* eslint-enable jsdoc/require-jsdoc */
	mixin(AnyHiddenToken, constructor);
	return AnyHiddenToken;
};

mixins['hiddenToken'] = __filename;
