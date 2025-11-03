import {getCondition} from '../parser/selector';
import type {TokenPredicate} from '../parser/selector';
import type {AstNodes, Token} from '../internal';

declare type ElementConstructor = abstract new (...args: any[]) => {
	readonly childNodes: readonly AstNodes[];
};

export interface ElementLike {

	/**
	 * Get the first descendant that matches the selector
	 *
	 * 符合选择器的第一个后代节点
	 * @param selector selector / 选择器
	 */
	querySelector<T = Token>(selector: string): T | undefined;

	/**
	 * Get all descendants that match the selector
	 *
	 * 符合选择器的所有后代节点
	 * @param selector selector / 选择器
	 */
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
					// @ts-expect-error only AstElement
					this,
				);
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

			querySelector<T = Token>(selector: string): T | undefined {
				return this.getElementBy(this.#getCondition<T>(selector));
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

			querySelectorAll<T = Token>(selector: string): T[] {
				return this.getElementsBy(this.#getCondition<T>(selector));
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
