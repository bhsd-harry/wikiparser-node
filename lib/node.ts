/* eslint-disable @typescript-eslint/no-base-to-string */
import {nodeLike} from '../mixin/nodeLike';
import type {AstNode as AstNodeBase, TokenTypes} from '../base';
import type {NodeLike} from '../mixin/nodeLike';
import type {
	AstText,
	Token,
} from '../internal';

export type AstNodes = AstText | Token;

export interface AstNode extends NodeLike {}

/**
 * Node-like
 *
 * 类似Node
 */
@nodeLike
export abstract class AstNode implements AstNodeBase {
	declare data?: string | undefined;
	readonly childNodes: readonly AstNodes[] = [];
	#parentNode: Token | undefined;
	#nextSibling: AstNodes | undefined;
	#previousSibling: AstNodes | undefined;

	abstract get type(): TokenTypes | 'text';
	abstract set type(value);

	/**
	 * Get the visible text
	 *
	 * 可见部分
	 */
	abstract text(): string;

	/** parent node / 父节点 */
	get parentNode(): Token | undefined {
		return this.#parentNode;
	}

	/** next sibling node / 后一个兄弟节点 */
	get nextSibling(): AstNodes | undefined {
		return this.#nextSibling;
	}

	/** previous sibling node / 前一个兄弟节点 */
	get previousSibling(): AstNodes | undefined {
		return this.#previousSibling;
	}

	/** @private */
	getChildNodes(): AstNodes[] {
		const {childNodes} = this;
		return childNodes as AstNodes[];
	}

	/** @private */
	getAttribute<T extends string>(key: T): TokenAttribute<T> {
		return this[key as keyof this] as TokenAttribute<T>;
	}

	/** @private */
	setAttribute<T extends string>(key: T, value: TokenAttribute<T>): void {
		switch (key) {
			case 'parentNode':
				this.#parentNode = value as TokenAttribute<'parentNode'>;
				if (!value) {
					this.#nextSibling = undefined;
					this.#previousSibling = undefined;
				}
				break;
			case 'nextSibling':
				this.#nextSibling = value as TokenAttribute<'nextSibling'>;
				break;
			case 'previousSibling':
				this.#previousSibling = value as TokenAttribute<'previousSibling'>;
				break;
			default:
				this[key as keyof this] = value as any; // eslint-disable-line @typescript-eslint/no-explicit-any
		}
	}

	/** @private */
	insertAdjacent(nodes: readonly (AstNodes | string)[], offset: 0 | 1): void {
		const {parentNode} = this;
		/* istanbul ignore if */
		if (!parentNode) {
			throw new Error('There is no parent node!');
		}
		const i = parentNode.childNodes.indexOf(this as AstNode as AstNodes) + offset;
		for (let j = 0; j < nodes.length; j++) {
			parentNode.insertAt(nodes[j] as string, i + j);
		}
	}

	/**
	 * Insert a batch of sibling nodes after the current node
	 *
	 * 在后方批量插入兄弟节点
	 * @param nodes nodes to be inserted / 插入节点
	 */
	after(...nodes: (AstNodes | string)[]): void {
		this.insertAdjacent(nodes, 1);
	}

	/**
	 * Insert a batch of sibling nodes before the current node
	 *
	 * 在前方批量插入兄弟节点
	 * @param nodes nodes to be inserted / 插入节点
	 */
	before(...nodes: (AstNodes | string)[]): void {
		this.insertAdjacent(nodes, 0);
	}

	/**
	 * Remove the current node
	 *
	 * 移除当前节点
	 */
	remove(): void {
		this.parentNode?.removeChild(this as AstNode as AstNodes);
	}
}
