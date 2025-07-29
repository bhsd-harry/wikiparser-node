/**
 * 解析后不可见的类
 * @param linter 是否覆写 lint 方法
 * @param html 是否覆写 toHtml 方法
 */
export const hiddenToken = (linter = true, html = true) => <T extends AstConstructor>(constructor: T): T => {
	/* eslint-disable jsdoc/require-jsdoc */
	abstract class AnyHiddenToken extends constructor {
		/** 没有可见部分 */
		override text(): string {
			return '';
		}
	}
	/* eslint-enable jsdoc/require-jsdoc */
	return AnyHiddenToken;
};
