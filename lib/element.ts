import {
	text,
} from '../util/string';
import {setChildNodes} from '../util/debug';
import {AstNode} from './node';
import {elementLike} from '../mixin/elementLike';
import type {ElementLike} from '../mixin/elementLike';
import type {
	AstNodes,
	AstText,
	Token,
} from '../internal';

export interface AstElement extends AstNode, ElementLike {}

/**
 * HTMLElement-like
 *
 * 类似HTMLElement
 */
@elementLike
export abstract class AstElement extends AstNode {
	declare readonly name?: string;
	declare readonly data: undefined;

	/** number of child nodes / 子节点总数 */
	get length(): number {
		return this.childNodes.length;
	}

	/** @private */
	text(separator?: string): string {
		return text(this.childNodes, separator);
	}

	/**
	 * Remove a child node
	 *
	 * 移除子节点
	 * @param i position of the child node / 移除位置
	 */
	removeAt(i: number): AstNodes {
		return setChildNodes(this as AstElement as Token, i, 1)[0]!;
	}

	/**
	 * Insert a child node
	 *
	 * 插入子节点
	 * @param node node to be inserted / 待插入的子节点
	 * @param i position to be inserted at / 插入位置
	 */
	insertAt<T extends AstNodes>(node: T, i = this.length): T {
		setChildNodes(this as AstElement as Token, i, 0, [node]);
		return node;
	}

	/**
	 * Insert a batch of child nodes at the end
	 *
	 * 在末尾批量插入子节点
	 * @param elements nodes to be inserted / 插入节点
	 */
	append(...elements: (AstNodes | string)[]): void {
		this.safeAppend(elements);
	}

	/** @private */
	safeAppend(elements: readonly (AstNodes | string)[]): void {
		for (const element of elements) {
			this.insertAt(element as AstNodes);
		}
	}

	/**
	 * Replace all child nodes
	 *
	 * 批量替换子节点
	 * @param elements nodes to be inserted / 新的子节点
	 */
	replaceChildren(...elements: (AstNodes | string)[]): void {
		this.safeReplaceChildren(elements);
	}

	/** @private */
	safeReplaceChildren(elements: readonly (AstNodes | string)[]): void {
		for (let i = this.length - 1; i >= 0; i--) {
			this.removeAt(i);
		}
		this.safeAppend(elements);
	}

	/**
	 * Modify the text child node
	 *
	 * 修改文本子节点
	 * @param str new text / 新文本
	 * @param i position of the text child node / 子节点位置
	 */
	setText(str: string, i = 0): string {
		i += i < 0 ? this.length : 0;
		const oldText = this.childNodes[i] as AstText;
		const {data} = oldText;
		oldText.replaceData(str);
		return data;
	}

	/** @private */
	override toString(skip?: boolean, separator = ''): string {
		return this.childNodes.map(child => child.toString(skip)).join(separator);
	}

	/**
	 * 获取子节点的位置
	 * @param node 子节点
	 */
	#getChildIndex(node: AstNodes): number {
		const i = this.childNodes.indexOf(node);
		return i;
	}

	/**
	 * Remove a child node
	 *
	 * 移除子节点
	 * @param node child node to be removed / 子节点
	 */
	removeChild<T extends AstNodes>(node: T): T {
		return this.removeAt(this.#getChildIndex(node)) as T;
	}
}
