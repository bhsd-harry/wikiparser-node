import type {LintError} from '../base';

/* NOT FOR BROWSER ONLY */

import {mixin} from '../util/debug';

/* NOT FOR BROWSER ONLY END */

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
	abstract class AnyHiddenToken extends constructor {
		override text(): string {
			return '';
		}

		override lint(start?: number): LintError[] {
			LINT: return linter ? [] : super.lint(start);
		}

		/* NOT FOR BROWSER */

		override dispatchEvent(e: Event, data: unknown): void {
			e.stopPropagation();
			super.dispatchEvent(e, data);
		}

		@cached()
		override toHtmlInternal(opt?: HtmlOpt): string {
			return html ? '' : super.toHtmlInternal(opt);
		}
	}

	/* NOT FOR BROWSER ONLY */

	mixin(AnyHiddenToken, constructor);

	/* NOT FOR BROWSER ONLY END */

	return AnyHiddenToken;
};

mixins['hiddenToken'] = __filename;
