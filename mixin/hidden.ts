/* NOT FOR BROWSER */

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

		/* NOT FOR BROWSER */

		@cached()
		override toHtmlInternal(opt?: HtmlOpt): string {
			return html ? '' : super.toHtmlInternal(opt);
		}
	}
	return AnyHiddenToken;
};
