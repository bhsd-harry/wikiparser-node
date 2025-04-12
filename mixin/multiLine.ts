import {mixin} from '../util/debug';

/* NOT FOR BROWSER */

import {mixins} from '../util/constants';

/* NOT FOR BROWSER END */

/**
 * 逐行解析的类
 * @ignore
 */
export const multiLine = <T extends AstConstructor>(constructor: T): T => {
	/** 不可包含换行符的类 */
	abstract class MultiLineToken extends constructor {
		override toString(skip?: boolean): string {
			return super.toString(skip, '\n');
		}

		override text(): string {
			return super.text('\n').replace(/\n\s*\n/gu, '\n');
		}

		/** @private */
		getGaps(): number {
			return 1;
		}

		override print(): string {
			return super.print({sep: '\n'});
		}
	}
	mixin(MultiLineToken, constructor);
	return MultiLineToken;
};

mixins['multiLine'] = __filename;
