import {cache} from '../util/lint';
import {nodeLike} from '../mixin/nodeLike';
import type {
	AstNode as AstNodeBase,
	TokenTypes,
} from '../base';
import type {NodeLike} from '../mixin/nodeLike';
import type {AstText, Token} from '../internal';
import type {TokenTypeMap, SelectedTokenTypes} from '../map';

export type AstNodes = AstText | Token;
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

	/* NOT FOR BROWSER END */

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

	/* NOT FOR BROWSER */

	/** @private */
	insertAdjacent(nodes: readonly (AstNodes | string)[], offset: 0 | 1): void {
		const {parentNode} = this;
		if (!parentNode) {
			return;
		}
		const i = parentNode.childNodes.indexOf(this as AstNode as AstNodes) + offset;
		for (let j = 0; j < nodes.length; j++) {
			parentNode.insertAt(nodes[j] as string, i + j);
		}
	}
}
