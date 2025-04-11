import {undo, Shadow, mixin} from '../util/debug';
import {mixins} from '../util/constants';
import {text} from '../util/string';
import type {AstNodes} from '../lib/node';

export interface SyntaxBase {
	/** @private */
	pattern: RegExp;
}

/**
 * 满足特定语法格式的Token
 * @param pattern 语法正则
 */
export const syntax = (pattern?: RegExp) => <S extends AstConstructor>(constructor: S): S => {
	/** 满足特定语法格式的Token */
	abstract class SyntaxToken extends constructor {
		declare pattern: RegExp;

		/** @class */
		constructor(...args: any[]) {
			super(...args); // eslint-disable-line @typescript-eslint/no-unsafe-argument
			if (pattern) {
				this.pattern = pattern;
			}
			this.seal('pattern', true);
		}

		override afterBuild(): void {
			super.afterBuild();
			const /** @implements */ syntaxListener: AstListener = (e, data) => {
				if (!Shadow.running && !this.pattern.test(text(this.childNodes))) {
					undo(e, data);
					this.constructorError('cannot modify the syntax pattern');
				}
			};
			this.addEventListener(['remove', 'insert', 'replace', 'text'], syntaxListener);
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

mixins['syntax'] = __filename;
