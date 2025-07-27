import {mixin} from '../util/debug';

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

		getGaps(): number {
			return 1;
		}

		override print(): string {
			return super.print({sep: '\n'});
		}
	}
	/* eslint-enable jsdoc/require-jsdoc */
	mixin(MultiLineToken, constructor);
	return MultiLineToken;
};
