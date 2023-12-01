import {undo, Shadow} from '../util/debug';
import {text} from '../util/string';
import * as Parser from '../index';
import type {AstNodes} from '../lib/node';

/**
 * 满足特定语法格式的Token
 * @param constructor 基类
 * @param pattern 语法正则
 */
export const syntax = <S extends AstConstructor>(constructor: S, pattern?: RegExp) => {
	/** 满足特定语法格式的Token */
	abstract class SyntaxToken extends constructor {
		#pattern = pattern!;

		/** @private */
		override afterBuild(): void {
			const /** @implements */ syntaxListener: AstListener = (e, data) => {
				if (!Shadow.running && !this.#pattern.test(this.text())) {
					undo(e, data);
					Parser.error(`不可修改 ${this.constructor.name} 的语法！`, this.#pattern);
					throw new Error(`不可修改 ${this.constructor.name} 的语法！`);
				}
			};
			this.addEventListener(['remove', 'insert', 'replace', 'text'], syntaxListener);
		}

		/** @private */
		override getAttribute<T extends string>(key: T): TokenAttributeGetter<T> {
			return key === 'pattern' ? this.#pattern as TokenAttributeGetter<T> : super.getAttribute(key);
		}

		/** @private */
		override setAttribute<T extends string>(key: T, value: TokenAttributeSetter<T>): void {
			if (key === 'pattern') {
				this.#pattern = (value as TokenAttributeSetter<'pattern'>)!;
			} else {
				super.setAttribute(key, value);
			}
		}

		/**
		 * @override
		 * @param elements 待替换的子节点
		 */
		override replaceChildren(...elements: (AstNodes | string)[]): void {
			if (Shadow.running || this.#pattern.test(text(elements))) {
				Shadow.run(() => {
					super.replaceChildren(...elements);
				});
			}
		}
	}
	return SyntaxToken;
};

Shadow.mixins['syntax'] = __filename;
