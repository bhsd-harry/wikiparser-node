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
 * @param constructor 基类
 * @param _ context
 */
export const syntax = (pattern?: RegExp) => <S extends AstConstructor>(constructor: S, _?: unknown): S => {
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

		/** @private */
		afterBuild(): void {
			const /** @implements */ syntaxListener: AstListener = (e, data) => {
				if (!Shadow.running && !this.pattern.test(this.text())) {
					undo(e, data);
					this.constructorError('不可修改语法');
				}
			};
			this.addEventListener(['remove', 'insert', 'replace', 'text'], syntaxListener);
		}

		/**
		 * @override
		 * @param elements 待替换的子节点
		 */
		override replaceChildren(...elements: (AstNodes | string)[]): void {
			if (Shadow.running || this.pattern.test(text(elements))) {
				Shadow.run(() => {
					super.replaceChildren(...elements);
				});
			}
		}
	}
	mixin(SyntaxToken, constructor);
	return SyntaxToken;
};

mixins['syntax'] = __filename;
