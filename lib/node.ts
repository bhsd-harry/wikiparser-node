/* eslint-disable @typescript-eslint/no-base-to-string */
import {cache} from '../util/lint';
import {Shadow} from '../util/debug';
import {cached} from '../mixin/cached';
import {nodeLike} from '../mixin/nodeLike';
import type {LintError, AstNode as AstNodeBase, TokenTypes} from '../base';
import type {Cached} from '../util/lint';
import type {NodeLike} from '../mixin/nodeLike';
import type {
	AstText,
	Token,
} from '../internal';

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
export interface CaretPosition {
	readonly offsetNode: AstNodes;
	readonly offset: number;
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
	#aIndex: Cached<number> | undefined;
	#rIndex: Record<number, Cached<number>> = {};

	abstract get type(): TokenTypes | 'text';
	abstract set type(value);

	/**
	 * Get the visible text
	 *
	 * 可见部分
	 */
	abstract text(): string;
	abstract lint(): LintError[] & {output?: string};
	abstract print(): string;

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
		return Object.isFrozen(childNodes) ? [...childNodes] : childNodes as AstNodes[];
	}

	/** @private */
	getAttribute<T extends string>(key: T): TokenAttribute<T> {
		return (key === 'padding' ? 0 : this[key as keyof this]) as TokenAttribute<T>;
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
			case 'aIndex':
				LINT: { // eslint-disable-line no-unused-labels
					if (Parser.viewOnly) {
						this.#aIndex = [Shadow.rev, value as TokenAttribute<'aIndex'>];
					}
				}
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

	/**
	 * Convert the position to the character index
	 *
	 * 将行列号转换为字符位置
	 * @param top line number / 行号
	 * @param left column number / 列号
	 */
	indexFromPos(top: number, left: number): number | undefined {
		LSP: { // eslint-disable-line no-unused-labels
			if (top < 0 || left < 0) {
				return undefined;
			}
			const lines = this.getLines();
			if (top >= lines.length) {
				return undefined;
			}
			const [, start, end] = lines[top]!,
				index = start + left;
			return index > end ? undefined : index;
		}
	}

	/**
	 * Convert the character indenx to the position
	 *
	 * 将字符位置转换为行列号
	 * @param index character index / 字符位置
	 */
	posFromIndex(index: number): Position | undefined {
		LINT: { // eslint-disable-line no-unused-labels
			const {length} = String(this);
			index += index < 0 ? length : 0;
			if (index >= 0 && index <= length) {
				const lines = this.getLines(),
					top = lines.findIndex(([,, end]) => index <= end);
				return {top, left: index - lines[top]![1]};
			}
			return undefined;
		}
	}

	/** @private */
	getDimension(): Dimension {
		LINT: { // eslint-disable-line no-unused-labels
			const lines = this.getLines(),
				last = lines[lines.length - 1]!;
			return {height: lines.length, width: last[2] - last[1]};
		}
	}

	/** @private */
	getGaps(_: number): number {
		return 0;
	}

	/**
	 * Get the relative character index of the current node, or its `j`-th child node
	 *
	 * 获取当前节点的相对字符位置，或其第`j`个子节点的相对字符位置
	 * @param j rank of the child node / 子节点序号
	 */
	getRelativeIndex(j?: number): number {
		LINT: { // eslint-disable-line no-unused-labels
			if (j === undefined) {
				const {parentNode} = this;
				return parentNode
					? parentNode.getRelativeIndex(parentNode.childNodes.indexOf(this as AstNode as AstNodes))
					: 0;
			}
			return cache<number>(
				this.#rIndex[j],
				() => {
					const {childNodes} = this,
						n = j + (j < 0 ? childNodes.length : 0);
					let acc = this.getAttribute('padding');
					for (let i = 0; i < n; i++) {
						if (Parser.viewOnly) {
							this.#rIndex[i] = [Shadow.rev, acc];
						}
						acc += childNodes[i]!.toString().length + this.getGaps(i);
					}
					return acc;
				},
				value => {
					this.#rIndex[j] = value;
				},
			);
		}
	}

	/**
	 * Get the absolute character index of the current node
	 *
	 * 获取当前节点的绝对位置
	 */
	getAbsoluteIndex(): number {
		LINT: return cache<number>( // eslint-disable-line no-unused-labels
			this.#aIndex,
			() => {
				const {parentNode} = this;
				return parentNode ? parentNode.getAbsoluteIndex() + this.getRelativeIndex() : 0;
			},
			value => {
				this.#aIndex = value;
			},
		);
	}

	/**
	 * Get the position and dimension of the current node
	 *
	 * 获取当前节点的行列位置和大小
	 */
	getBoundingClientRect(): Dimension & Position {
		// eslint-disable-next-line no-unused-labels
		LSP: return {
			...this.getDimension(),
			...this.getRootNode().posFromIndex(this.getAbsoluteIndex())!,
		};
	}

	/**
	 * Whether to be of a certain type
	 *
	 * 是否是某种类型的节点
	 * @param type token type / 节点类型
	 * @since v1.10.0
	 */
	is<T extends Token>(type: TokenTypes): this is T {
		return this.type === type;
	}

	/**
	 * Get the text and the start/end positions of all lines
	 *
	 * 获取所有行的wikitext和起止位置
	 * @since v1.16.3
	 */
	@cached(false)
	getLines(): [string, number, number][] {
		LINT: { // eslint-disable-line no-unused-labels
			const results: [string, number, number][] = [];
			let start = 0;
			for (const line of String(this).split('\n')) {
				const end = start + line.length;
				results.push([line, start, end]);
				start = end + 1;
			}
			return results;
		}
	}

	/* PRINT ONLY */

	/** @private */
	seal(key: string, permanent?: boolean): void {
		const enumerable = !permanent && Boolean(this[key as keyof this]);
		Object.defineProperty(this, key, {
			enumerable,
			configurable: true,
		});
	}
}
