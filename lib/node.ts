import {cache} from '../util/lint';
import {nodeLike} from '../mixin/nodeLike';
import type {
	AstNode as AstNodeBase,
	TokenTypes,
} from '../base';
import type {NodeLike} from '../mixin/nodeLike';
import type {AstText, Token} from '../internal';
import type {TokenTypeMap, SelectedTokenTypes} from '../map';

/* PRINT ONLY */

import Parser from '../index';

/* PRINT ONLY END */

export type AstNodes = AstText | Token;
export interface Dimension {
	readonly height: number;
	readonly width: number;
}
export interface Position {
	readonly top: number;
	readonly left: number;
}
export interface Font {
	bold: boolean;
	italic: boolean;
}

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
	#root: Cached<Token | this> | undefined;

	/* NOT FOR BROWSER */

	readonly #optional = new Set<string>();

	/* NOT FOR BROWSER END */

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

	/* NOT FOR BROWSER */

	/** previous sibling element / 前一个非文本兄弟节点 */
	get previousElementSibling(): Token | undefined {
		const childNodes = this.parentNode?.childNodes;
		return childNodes?.slice(0, childNodes.indexOf(this as AstNode as AstNodes))
			.findLast((child): child is Token => child.type !== 'text');
	}

	/** next visibling sibling node / 后一个可见的兄弟节点 */
	get nextVisibleSibling(): AstNodes | undefined {
		let {nextSibling} = this;
		while (nextSibling?.text() === '') {
			({nextSibling} = nextSibling);
		}
		return nextSibling;
	}

	/** previous visible sibling node / 前一个可见的兄弟节点 */
	get previousVisibleSibling(): AstNodes | undefined {
		let {previousSibling} = this;
		while (previousSibling?.text() === '') {
			({previousSibling} = previousSibling);
		}
		return previousSibling;
	}

	constructor() {
		if (!Parser.viewOnly && !Parser.internal) {
			Object.defineProperty(this, 'childNodes', {writable: false});
			Object.freeze(this.childNodes);
		}
	}

	/* NOT FOR BROWSER END */

	/** @private */
	getChildNodes(): AstNodes[] {
		const {childNodes} = this;
		if (Object.isFrozen(childNodes)) { // eslint-disable-line unicorn/prefer-ternary
			return [...childNodes];
		}
		return childNodes as AstNodes[];
	}

	/** @private */
	getAttribute<T extends string>(key: T): TokenAttribute<T> {
		return (key === 'padding' ? 0 : /* c8 ignore next */ this[key as keyof this]) as TokenAttribute<T>;
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

				/* NOT FOR BROWSER */

				if (Object.hasOwn(this, key)) {
					const descriptor = Object.getOwnPropertyDescriptor(this, key)!,
						bool = Boolean(value),
						optional = this.#optional.has(key) && descriptor.enumerable !== bool;
					if (optional) {
						descriptor.enumerable = bool;
					}
					const oldValue = this[key as keyof this];
					if (typeof value === 'object' && typeof oldValue === 'object' && Object.isFrozen(oldValue)) {
						Object.freeze(value);
					}
					if (optional || !descriptor.writable) {
						Object.defineProperty(this, key, {...descriptor, value});
						return;
					}
				}

				/* NOT FOR BROWSER END */

				this[key as keyof this] = value as any; // eslint-disable-line @typescript-eslint/no-explicit-any
		}
	}

	/**
	 * Get the root node
	 *
	 * 获取根节点
	 */
	getRootNode(): Token | this {
		return cache<Token | this>(
			this.#root,
			() => this.parentNode?.getRootNode() ?? this,
			value => {
				const [, root] = value;
				if (root.type === 'root') {
					this.#root = value;
				}
			},
		);
	}

	/** @private */
	getGaps(_: number): number {
		return 0;
	}

	/**
	 * Whether to be of a certain type
	 *
	 * 是否是某种类型的节点
	 * @param type token type / 节点类型
	 * @since v1.10.0
	 */
	is<K extends SelectedTokenTypes>(type: K): this is TokenTypeMap[K];
	is<T extends Token>(type: TokenTypes): this is T;
	is(type: TokenTypes): this is Token {
		return this.type === type;
	}

	/** @private */
	removeInternal(): number | undefined {
		PRINT: {
			const {parentNode} = this,
				i = parentNode?.childNodes.indexOf(this as AstNode as AstNodes);
			parentNode?.removeAt(i!);
			return i;
		}
	}

	/* PRINT ONLY */

	/** @private */
	seal(key: string, permanent?: boolean): void {
		LSP: {
			if (Parser.internal) {
				return;

				/* NOT FOR BROWSER */
			} else if (!permanent) {
				this.#optional.add(key);

				/* NOT FOR BROWSER END */
			}
			const enumerable = !permanent && Boolean(this[key as keyof this]);
			if (
				!enumerable
				|| !Parser.viewOnly
			) {
				Object.defineProperty(this, key, {
					enumerable,
					configurable: true,

					/* NOT FOR BROWSER */

					writable: Parser.viewOnly,
				});
			}
		}
	}

	/* PRINT ONLY END */

	/* NOT FOR BROWSER */

	/** @private */
	insertAdjacent(nodes: readonly (AstNodes | string)[], offset: 0 | 1): void {
		const {parentNode} = this;
		const i = parentNode!.childNodes.indexOf(this as AstNode as AstNodes) + offset;
		for (let j = 0; j < nodes.length; j++) {
			parentNode!.insertAt(nodes[j] as string, i + j);
		}
	}

	/**
	 * Insert a batch of sibling nodes after the current node
	 *
	 * 在后方批量插入兄弟节点
	 * @param nodes nodes to be inserted / 插入节点
	 * @throws `Error` if the current node has no parent node
	 */
	after(...nodes: (AstNodes | string)[]): void {
		this.insertAdjacent(nodes, 1);
	}

	/**
	 * Remove the current node
	 *
	 * 移除当前节点
	 */
	remove(): void {
		this.removeInternal();
	}

	/**
	 * Replace the current node with new nodes
	 *
	 * 将当前节点批量替换为新的节点
	 * @param nodes nodes to be inserted / 插入节点
	 * @throws `Error` if the current node has no parent node
	 */
	replaceWith(...nodes: (AstNodes | string)[]): void {
		this.insertAdjacent(nodes, 1);
		this.removeInternal();
	}

	/**
	 * Check if the node is a descendant
	 *
	 * 是自身或后代节点
	 * @param node node to be compared to / 待检测节点
	 */
	contains(node: AstNode): boolean {
		let parentNode: AstNode | undefined = node;
		while (parentNode && parentNode !== this) {
			({parentNode} = parentNode);
		}
		return Boolean(parentNode);
	}

	/**
	 * Get all the ancestor nodes
	 *
	 * 获取所有祖先节点
	 */
	getAncestors(): Token[] {
		const ancestors: Token[] = [];
		let {parentNode} = this;
		while (parentNode) {
			ancestors.push(parentNode);
			({parentNode} = parentNode);
		}
		return ancestors;
	}
}
