import {mixin} from '../util/debug';

export interface SyntaxBase {
	/** @private */
	pattern: RegExp;
}

/**
 * 满足特定语法格式的Token
 * @param pattern 语法正则
 */
export const syntax = (pattern?: RegExp) => <S extends AstConstructor>(constructor: S): S => {
	abstract class SyntaxToken extends constructor implements SyntaxBase {
		declare pattern: RegExp;

		constructor(...args: any[]) {
			super(...args); // eslint-disable-line @typescript-eslint/no-unsafe-argument
			if (pattern) {
				this.pattern = pattern;
			}
		}
	}
	mixin(SyntaxToken, constructor);
	return SyntaxToken;
};
