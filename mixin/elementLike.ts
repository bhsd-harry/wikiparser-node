import {mixin} from '../util/debug';
import {getCondition} from '../util/selector';
import type {TokenPredicate} from '../util/selector';
import type {AstElement} from '../lib/element';
import type {AstNodes, Token} from '../internal';

/* NOT FOR BROWSER */

import {mixins} from '../util/constants';

/* NOT FOR BROWSER END */

declare type ElementConstructor = abstract new (...args: any[]) => {
	readonly childNodes: readonly AstNodes[];

	/* NOT FOR BROWSER */

	detach?: () => void; // eslint-disable-line @typescript-eslint/method-signature-style
};

export interface ElementLike {

	/* NOT FOR BROWSER */

	/** all child elements / 全部非文本子节点 */
	readonly children: Token[];

	/** first child element / 首位非文本子节点 */
	readonly firstElementChild: Token | undefined;

	/** last child element / 末位非文本子节点 */
	readonly lastElementChild: Token | undefined;

	/** number of child elements / 非文本子节点总数 */
	readonly childElementCount: number;

	/* NOT FOR BROWSER END */

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

	/* NOT FOR BROWSER */

	/**
	 * Get the first descendant of the types
	 *
	 * 类型选择器
	 * @param types token types / 节点类型
	 */
	getElementByTypes<T = Token>(types: string): T | undefined;

	/**
	 * Get the first descendant with the id
	 *
	 * id选择器
	 * @param id id名
	 */
	getElementById<T = Token>(id: string): T | undefined;

	/**
	 * Get all descendants with the class
	 *
	 * 类选择器
	 * @param className class name / 类名之一
	 */
	getElementsByClassName<T = Token>(className: string): T[];

	/**
	 * Get all descendants with the tag name
	 *
	 * 标签名选择器
	 * @param tag tag name / 标签名
	 */
	getElementsByTagName<T = Token>(tag: string): T[];
}

/** @ignore */
export const elementLike = <S extends ElementConstructor>(constructor: S): S => {
	LINT: {
		abstract class ElementLike extends constructor implements ElementLike {
			/* NOT FOR BROWSER */

			get children(): Token[] {
				return this.childNodes.filter((child): child is Token => child.type !== 'text');
			}

			get firstElementChild(): Token | undefined {
				return this.childNodes.find((child): child is Token => child.type !== 'text');
			}

			get lastElementChild(): Token | undefined {
				return this.childNodes.findLast((child): child is Token => child.type !== 'text');
			}

			get childElementCount(): number {
				return this.children.length;
			}

			/* NOT FOR BROWSER END */

			#getCondition<T>(selector: string): TokenPredicate<T> {
				return getCondition<T>(
					selector,
					// eslint-disable-next-line unicorn/no-negated-condition, @stylistic/operator-linebreak
					!('type' in this) ?
						undefined : // eslint-disable-line @stylistic/operator-linebreak
						this as unknown as AstElement,
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

					/* NOT FOR BROWSER */

					this.detach?.();
				}
			}

			/* NOT FOR BROWSER */

			getElementByTypes<T = Token>(types: string): T | undefined {
				const typeSet = new Set(types.split(',').map(str => str.trim()));
				return this.getElementBy((({type}) => typeSet.has(type)) as TokenPredicate<T>);
			}

			getElementById<T = Token>(id: string): T | undefined {
				return this.getElementBy((token => 'id' in token && token.id === id) as TokenPredicate<T>);
			}

			getElementsByClassName<T = Token>(className: string): T[] {
				return this.getElementsBy(
					(
						token => 'classList' in token && (token.classList as Set<string>).has(className)
					) as TokenPredicate<T>,
				);
			}

			getElementsByTagName<T = Token>(tag: string): T[] {
				return this.getElementsBy<T>(
					(({type, name}) => name === tag && (type === 'html' || type === 'ext')) as TokenPredicate<T>,
				);
			}
		}
		mixin(ElementLike, constructor);
		return ElementLike;
	}
};

mixins['elementLike'] = __filename;
