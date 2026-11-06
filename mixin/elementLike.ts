import {getCondition} from '../util/selector';
import type {AstElement} from '../lib/element';
import type {
	AstNodes,
	Token,
} from '../internal';
import type {TokenTypeMap, SelectedTokenTypes} from '../map';

/* NOT FOR BROWSER ONLY */

import {mixin} from '../util/debug';

/* NOT FOR BROWSER ONLY END */

declare type ElementConstructor = abstract new (...args: any[]) => {
	readonly parentNode: Token | undefined;
	readonly childNodes: readonly AstNodes[];

	/* NOT FOR BROWSER */

	detach?: () => void; // eslint-disable-line @typescript-eslint/method-signature-style
};

export interface ElementLike {

	/* NOT FOR BROWSER */

	/** all child elements / 全部非文本子节点 */
	readonly children: Token[];

	/** number of child elements / 非文本子节点总数 */
	readonly childElementCount: number;

	/* NOT FOR BROWSER END */

	/**
	 * Get the closest ancestor node that matches the selector
	 *
	 * 最近的符合选择器的祖先节点
	 * @param selector selector / 选择器
	 * @throws `SyntaxError` if the selector is invalid
	 */
	closest<K extends SelectedTokenTypes>(selector: K): TokenTypeMap[K] | undefined;
	closest<T = Token>(selector: string): T | undefined;

	/**
	 * Get the first descendant that matches the selector
	 *
	 * 符合选择器的第一个后代节点
	 * @param selector selector / 选择器
	 * @throws `SyntaxError` if the selector is invalid
	 */
	querySelector<K extends SelectedTokenTypes>(selector: K): TokenTypeMap[K] | undefined;
	querySelector<T = Token>(selector: string): T | undefined;

	/**
	 * Get all descendants that match the selector
	 *
	 * 符合选择器的所有后代节点
	 * @param selector selector / 选择器
	 * @throws `SyntaxError` if the selector is invalid
	 */
	querySelectorAll<K extends SelectedTokenTypes>(selector: K): TokenTypeMap[K][];
	querySelectorAll<T = Token>(selector: string): T[];
}

/** @ignore */
export const elementLike = <S extends ElementConstructor>(constructor: S): S => {
	abstract class ElementLike extends constructor implements ElementLike {
		/* NOT FOR BROWSER */

		get children(): Token[] {
			return this.childNodes.filter((child): child is Token => child.type !== 'text');
		}

		get childElementCount(): number {
			return this.children.length;
		}

		/* NOT FOR BROWSER END */

		#getCondition<T>(selector: string): TokenPredicate<T> {
			return getCondition<T>(
				selector,
				// eslint-disable-next-line unicorn/no-negated-condition
				!('type' in this) ?
					undefined :
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
	}

	/* NOT FOR BROWSER ONLY */

	mixin(ElementLike, constructor);

	/* NOT FOR BROWSER ONLY END */

	return ElementLike;
};
