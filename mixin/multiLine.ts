import {mixin} from '../util/debug';

/**
 * 逐行解析的类
 * @ignore
 */
export const multiLine = <T extends AstConstructor>(constructor: T): T => {
	/** 不可包含换行符的类 */
	abstract class MultiLineToken extends constructor {
		/** @private */
		override toString(skip?: boolean): string {
			return super.toString(skip, '\n');
		}

		/** @private */
		override text(): string {
			return super.text('\n').replace(/\n\s*\n/gu, '\n');
		}

		/** @private */
		getGaps(): number {
			return 1;
		}
	}
	mixin(MultiLineToken, constructor);
	return MultiLineToken;
};
