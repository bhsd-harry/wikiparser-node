import {getCondition} from '../util/selector';
import type {TokenPredicate} from '../util/selector';
import type {AstElement} from '../lib/element';
import type {
	AstNodes,
	Token,
} from '../internal';
import type {TokenTypeMap, SelectedTokenTypes} from '../map';

declare type ElementConstructor = abstract new (...args: any[]) => {
	readonly parentNode: Token | undefined;
	readonly childNodes: readonly AstNodes[];
};

export interface ElementLike {

	/**
	 * Get the closest ancestor node that matches the selector
	 *
	 * 最近的符合选择器的祖先节点
	 * @param selector selector / 选择器
	 */
	closest<K extends SelectedTokenTypes>(selector: K): TokenTypeMap[K] | undefined;
	closest<T = Token>(selector: string): T | undefined;

	/**
	 * Get the first descendant that matches the selector
	 *
	 * 符合选择器的第一个后代节点
	 * @param selector selector / 选择器
	 */
	querySelector<K extends SelectedTokenTypes>(selector: K): TokenTypeMap[K] | undefined;
	querySelector<T = Token>(selector: string): T | undefined;

	/**
	 * Get all descendants that match the selector
	 *
	 * 符合选择器的所有后代节点
	 * @param selector selector / 选择器
	 */
	querySelectorAll<K extends SelectedTokenTypes>(selector: K): TokenTypeMap[K][];
	querySelectorAll<T = Token>(selector: string): T[];

	/**
	 * Escape `=` and `|`
	 *
	 * 转义 `=` 和 `|`
	 * @since v1.18.3
	 */
	escape(): void;
}

/** @ignore */
export const elementLike = <S extends ElementConstructor>(constructor: S): S => {
	LINT: {
		abstract class ElementLike extends constructor implements ElementLike {
			#getCondition<T>(selector: string): TokenPredicate<T> {
				return getCondition<T>(
					selector,
					this as unknown as AstElement,
				);
			}

			closest(selector: string): Token | undefined {
				const condition = this.#getCondition(selector);
				let {parentNode} = this;
				while (parentNode) {
					if (condition(parentNode)) {
						return parentNode;
					}
					({parentNode} = parentNode);
				}
				return undefined;
			}

			getElementBy<T>(condition: TokenPredicate<T>): T | undefined {
				const stack = [...this.childNodes].reverse();
				while (stack.length > 0) {
					const child = stack.pop()!,
						{type, childNodes} = child;
					if (type === 'text') {
						continue;
					} else if (condition(child)) {
						return child;
					}
					for (let i = childNodes.length - 1; i >= 0; i--) {
						stack.push(childNodes[i]!);
					}
				}
				return undefined;
			}

			querySelector(selector: string): Token | undefined {
				return this.getElementBy(this.#getCondition(selector));
			}

			getElementsBy<T>(condition: TokenPredicate<T>): T[] {
				const stack = [...this.childNodes].reverse(),
					descendants: T[] = [];
				while (stack.length > 0) {
					const child = stack.pop()!,
						{type, childNodes} = child;
					if (type === 'text') {
						continue;
					} else if (condition(child)) {
						descendants.push(child);
					}
					for (let i = childNodes.length - 1; i >= 0; i--) {
						stack.push(childNodes[i]!);
					}
				}
				return descendants;
			}

			querySelectorAll(selector: string): Token[] {
				return this.getElementsBy(this.#getCondition(selector));
			}

			escape(): void {
				LSP: {
					for (const child of this.childNodes) {
						child.escape();
					}
				}
			}
		}
		return ElementLike;
	}
};
