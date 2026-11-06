import {Shadow, mixin} from '../util/debug';
import {text} from '../util/string';
import type {AstNodes} from '../internal';

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
			this.seal('pattern', true);
		}

		override safeReplaceChildren(elements: readonly (AstNodes | string)[]): void {
			if (Shadow.running || this.pattern.test(text(elements))) {
				Shadow.run(() => {
					super.safeReplaceChildren(elements);
				});
			}
		}
	}
	mixin(SyntaxToken, constructor);
	return SyntaxToken;
};
