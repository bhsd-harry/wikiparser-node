import {mixin} from '../util/debug';
import {mixins} from '../util/constants';
import type {Token} from '../internal';

/**
 * 只能位于行首的类
 * @param self 是否允许同类节点相邻
 */
export const sol = (self?: boolean) => <T extends AstConstructor>(constructor: T): T => {
	/** 只能位于行首的类 */
	abstract class SolToken extends constructor {
		/** @implements */
		#prependNewLine(): string {
			const {previousVisibleSibling, parentNode, type} = this as unknown as Token;
			if (previousVisibleSibling) {
				return self && previousVisibleSibling.type === type
					|| previousVisibleSibling.toString().endsWith('\n')
					? ''
					: '\n';
			}
			return parentNode?.type === 'root'
				|| type === 'list' && parentNode?.type === 'list-range'
				|| type !== 'heading' && parentNode?.type === 'ext-inner' && parentNode.name === 'poem'
				? ''
				: '\n';
		}

		override toString(skip?: boolean): string {
			return this.#prependNewLine() + super.toString(skip);
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
