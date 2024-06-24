import {mixin} from '../util/debug';
import {mixins} from '../util/constants';
import type {Token} from '../src/index';

/**
 * 只能位于行首的类
 * @param constructor 基类
 * @param _ context
 */
export const sol = <T extends AstConstructor>(constructor: T, _?: unknown): T => {
	/** 只能位于行首的类 */
	abstract class SolToken extends constructor {
		/** @implements */
		#prependNewLine(): string {
			const {previousVisibleSibling, parentNode, type} = this as unknown as Token;
			if (previousVisibleSibling) {
				return previousVisibleSibling.toString().endsWith('\n') ? '' : '\n';
			}
			return parentNode?.type === 'root'
				|| type !== 'heading' && parentNode?.type === 'ext-inner' && parentNode.name === 'poem'
				? ''
				: '\n';
		}

		override toString(): string {
			return this.#prependNewLine() + super.toString();
		}

		override getAttribute<S extends string>(key: S): TokenAttribute<S> {
			return key === 'padding'
				? this.#prependNewLine().length + super.getAttribute('padding') as TokenAttribute<S>
				: super.getAttribute(key);
		}

		override text(): string {
			return this.#prependNewLine() + super.text();
		}
	}
	mixin(SolToken, constructor);
	return SolToken;
};

mixins['sol'] = __filename;
