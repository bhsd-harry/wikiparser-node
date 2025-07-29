/**
 * 逐行解析的类
 * @ignore
 */
export const multiLine = <T extends AstConstructor>(constructor: T): T => {
	/* eslint-disable jsdoc/require-jsdoc */
	abstract class MultiLineToken extends constructor {
		override toString(skip?: boolean): string {
			return super.toString(skip, '\n');
		}

		override text(): string {
			return super.text('\n').replace(/\n\s*\n/gu, '\n');
		}
	}
	/* eslint-enable jsdoc/require-jsdoc */
	return MultiLineToken;
};
