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
}
