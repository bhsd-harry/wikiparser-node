import {mixin} from '../util/debug';
import {getCondition} from '../parser/selector';
import {AstElement} from '../lib/element';
import type {TokenPredicate} from '../parser/selector';
import type {AstNodes, Token} from '../internal';

declare type ElementConstructor = abstract new (...args: any[]) => {
	readonly childNodes: readonly AstNodes[];
	detach?: () => void; // eslint-disable-line @typescript-eslint/method-signature-style
};

export interface ElementLike {
	/** @private */
	getElementBy<T>(condition: TokenPredicate<T>): T | undefined;

	/**
	 * Get the first descendant that matches the selector
	 *
	 * 符合选择器的第一个后代节点
	 * @param selector selector / 选择器
	 */
	querySelector<T = Token>(selector: string): T | undefined;

	/** @private */
	getElementsBy<T>(condition: TokenPredicate<T>, descendants?: T[]): T[];

	/**
	 * Get all descendants that match the selector
	 *
	 * 符合选择器的所有后代节点
	 * @param selector selector / 选择器
	 */
	querySelectorAll<T = Token>(selector: string): T[];
}

/** @ignore */
export const elementLike = <S extends ElementConstructor>(constructor: S): S => {
	/* eslint-disable jsdoc/require-jsdoc */
	abstract class ElementLike extends constructor implements ElementLike {
		getElementBy<T>(condition: TokenPredicate<T>): T | undefined {
			for (const child of this.childNodes) {
				if (child.type === 'text') {
					continue;
				} else if (condition(child)) {
					return child;
				}
				const descendant = child.getElementBy(condition);
				if (descendant) {
					return descendant;
				}
			}
			return undefined;
		}

		querySelector<T = Token>(selector: string): T | undefined {
			const condition = getCondition<T>(
				selector,
				// eslint-disable-next-line unicorn/no-negated-condition, @stylistic/operator-linebreak
				!(this instanceof AstElement) ?
					undefined : // eslint-disable-line @stylistic/operator-linebreak
					this,
			);
			return this.getElementBy(condition);
		}

		getElementsBy<T>(condition: TokenPredicate<T>, descendants: T[] = []): T[] {
			for (const child of this.childNodes) {
				if (child.type === 'text') {
					continue;
				} else if (condition(child)) {
					descendants.push(child);
				}
				child.getElementsBy(condition, descendants);
			}
			return descendants;
		}

		querySelectorAll<T = Token>(selector: string): T[] {
			const condition = getCondition<T>(selector, this instanceof AstElement ? this : undefined);
			return this.getElementsBy(condition);
		}
	}
	/* eslint-enable jsdoc/require-jsdoc */
	mixin(ElementLike, constructor);
	return ElementLike;
};
