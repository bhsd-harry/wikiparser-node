import {
	text,
} from '../util/string';
import {setChildNodes} from '../util/debug';
import {AstNode} from './node';
import {elementLike} from '../mixin/elementLike';
import type {
	TokenTypes,
} from '../base';
import type {ElementLike} from '../mixin/elementLike';
import type {
	AstNodes,
	AstText,
	Token,
} from '../internal';

/* NOT FOR BROWSER */

import {readOnly} from '../mixin/readOnly';

/* NOT FOR BROWSER END */

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
	 * @throws `RangeError` if the child node does not exist
	 */
	@readOnly()
	removeAt(i: number): AstNodes {
		LSP: return setChildNodes(this as AstElement as Token, i, 1)[0]!;
	}

	/**
	 * Insert a child node
	 *
	 * 插入子节点
	 * @param node node to be inserted / 待插入的子节点
	 * @param i position to be inserted at / 插入位置
	 * @throws `RangeError` cannot insert an ancestor node or its own child node
	 */
	@readOnly()
	insertAt<T extends AstNodes>(node: T, i = this.length): T {
		/* NOT FOR BROWSER */

		node.parentNode?.removeChild(node);

		/* NOT FOR BROWSER END */

		setChildNodes(this as AstElement as Token, i, 0, [node]);
		return node;
	}

	/** @private */
	isInside(type: TokenTypes): boolean {
		LINT: return this.closest(`${type},ext`)?.type === type;
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

	/** @private */
	safeReplaceChildren(elements: readonly (AstNodes | string)[]): void {
		LSP: {
			for (let i = this.length - 1; i >= 0; i--) {
				this.removeAt(i);
			}
			this.safeAppend([...elements]);
		}
	}

	/**
	 * Modify the text child node
	 *
	 * 修改文本子节点
	 * @param str new text / 新文本
	 * @param i position of the text child node / 子节点位置
	 * @throws `RangeError` if the child node does not exist or is not a text node
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

	/* NOT FOR BROWSER */

	/**
	 * Merge adjacent text child nodes
	 *
	 * 合并相邻的文本子节点
	 */
	normalize(): void {
		const childNodes = this.getChildNodes();

		/**
		 * 移除子节点
		 * @param i 移除位置
		 */
		const remove = (i: number): void => {
			childNodes[i]!.setAttribute('parentNode', undefined);
			childNodes.splice(i, 1);
			childNodes[i - 1]?.setAttribute('nextSibling', childNodes[i]);
			childNodes[i]?.setAttribute('previousSibling', childNodes[i - 1]);
		};
		for (let i = childNodes.length - 1; i >= 0; i--) {
			const {type, data} = childNodes[i]!;
			if (type !== 'text' || childNodes.length === 1 || this.getGaps(i - (i && 1))) {
				//
			} else if (data === '') {
				remove(i);
			} else {
				const prev = childNodes[i - 1];
				if (prev?.type === 'text') {
					prev.setAttribute('data', prev.data + data);
					remove(i);
				}
			}
		}
		this.setAttribute('childNodes', childNodes);
	}

	/**
	 * 获取子节点的位置
	 * @param node 子节点
	 * @throws `RangeError` 找不到子节点
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
	 * @throws `RangeError` if not a child node
	 */
	removeChild<T extends AstNodes>(node: T): T {
		return this.removeAt(this.#getChildIndex(node)) as T;
	}
}
