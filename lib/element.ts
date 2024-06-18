import {
	text,
} from '../util/string';
import {setChildNodes} from '../util/debug';
import {AstNode} from './node';
import type {
	LintError,
} from '../base';
import type {AstNodes, AstText, Token} from '../internal';

// @ts-expect-error unconstrained predicate
declare type TokenPredicate<T = Token> = (token: Token) => token is T;

/**
 * 将选择器转化为类型谓词
 * @param selector 选择器
 */
const getCondition = <T>(selector: string): TokenPredicate<T> => {
	const types = new Set(selector.split(',').map(str => str.trim()));
	return (({type}) => types.has(type)) as TokenPredicate<T>;
};

/** 类似HTMLElement */
export abstract class AstElement extends AstNode {
	declare readonly name?: string;
	declare readonly data: undefined;

	/** 子节点总数 */
	get length(): number {
		return this.childNodes.length;
	}

	/** @private */
	text(separator?: string): string {
		return text(this.childNodes, separator);
	}

	/** @private */
	normalize(): void {
		const childNodes = [...this.childNodes];

		/**
		 * 移除子节点
		 * @param i 移除位置
		 */
		const remove = (i: number): void => {
			childNodes.splice(i, 1);
		};
		for (let i = childNodes.length - 1; i >= 0; i--) {
			const {type, data} = childNodes[i]!;
			if (type !== 'text' || this.getGaps(i - 1)) {
				//
			} else if (data === '') {
				remove(i);
			}
		}
		this.setAttribute('childNodes', childNodes);
	}

	/**
	 * 移除子节点
	 * @param i 移除位置
	 */
	removeAt(i: number): AstNodes {
		return setChildNodes(this as AstElement as Token, i, 1)[0]!;
	}

	/**
	 * 插入子节点
	 * @param node 待插入的子节点
	 * @param i 插入位置
	 */
	insertAt<T extends AstNodes>(node: T, i = this.length): T {
		setChildNodes(this as AstElement as Token, i, 0, [node]);
		return node;
	}

	/**
	 * 最近的祖先节点
	 * @param selector 选择器
	 */
	closest<T = Token>(selector: string): T | undefined {
		const condition = getCondition<T>(selector);
		let {parentNode} = this;
		while (parentNode) {
			if (condition(parentNode)) {
				return parentNode;
			}
			({parentNode} = parentNode);
		}
		return undefined;
	}

	/**
	 * 符合条件的第一个后代节点
	 * @param condition 条件
	 */
	#getElementBy<T>(condition: TokenPredicate<T>): T | undefined {
		for (const child of this.childNodes) {
			if (child.type === 'text') {
				continue;
			} else if (condition(child)) {
				return child;
			}
			const descendant = child.#getElementBy(condition);
			if (descendant) {
				return descendant;
			}
		}
		return undefined;
	}

	/**
	 * 符合选择器的第一个后代节点
	 * @param selector 选择器
	 */
	querySelector<T = Token>(selector: string): T | undefined {
		const condition = getCondition<T>(selector);
		return this.#getElementBy(condition);
	}

	/**
	 * 符合条件的所有后代节点
	 * @param condition 条件
	 */
	#getElementsBy<T>(condition: TokenPredicate<T>): T[] {
		const descendants: T[] = [];
		for (const child of this.childNodes) {
			if (child.type === 'text') {
				continue;
			} else if (condition(child)) {
				descendants.push(child);
			}
			descendants.push(...child.#getElementsBy(condition));
		}
		return descendants;
	}

	/**
	 * 符合选择器的所有后代节点
	 * @param selector 选择器
	 */
	querySelectorAll<T = Token>(selector: string): T[] {
		const condition = getCondition<T>(selector);
		return this.#getElementsBy(condition);
	}

	/**
	 * 在末尾批量插入子节点
	 * @param elements 插入节点
	 */
	append(...elements: (AstNodes | string)[]): void {
		for (const element of elements) {
			this.insertAt(element as AstNodes);
		}
	}

	/**
	 * 批量替换子节点
	 * @param elements 新的子节点
	 */
	replaceChildren(...elements: (AstNodes | string)[]): void {
		for (let i = this.length - 1; i >= 0; i--) {
			this.removeAt(i);
		}
		this.append(...elements);
	}

	/**
	 * 修改文本子节点
	 * @param str 新文本
	 * @param i 子节点位置
	 */
	setText(str: string, i = 0): string {
		i += i < 0 ? this.length : 0;
		const oldText = this.childNodes[i] as AstText;
		const {data} = oldText;
		oldText.replaceData(str);
		return data;
	}

	/** @private */
	override toString(separator = ''): string {
		return this.childNodes.map(String).join(separator);
	}

	/** @private */
	lint(start = this.getAbsoluteIndex(), re?: RegExp | false): LintError[] {
		const errors: LintError[] = [];
		for (let i = 0, cur = start + this.getAttribute('padding'); i < this.length; i++) {
			const child = this.childNodes[i]!;
			errors.push(...child.lint(cur, re));
			cur += child.toString().length + this.getGaps(i);
		}
		return errors;
	}
}
