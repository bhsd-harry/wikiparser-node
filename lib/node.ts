/* eslint-disable @typescript-eslint/no-base-to-string */
import findIndex from '../util/search';
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

	/* NOT FOR BROWSER */

	QuoteToken,
	ExtLinkToken,
	HtmlToken,
} from '../internal';

/* PRINT ONLY */

import Parser from '../index';

/* PRINT ONLY END */

/* NOT FOR BROWSER */

import assert from 'assert/strict';
import {EventEmitter} from 'events';
import {classes} from '../util/constants';

/* NOT FOR BROWSER END */

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

	/* NOT FOR BROWSER */

	readonly #optional = new Set<string>();
	readonly #events = new EventEmitter();

	/* NOT FOR BROWSER END */

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

	/* NOT FOR BROWSER */

	/** next sibling element / 后一个非文本兄弟节点 */
	get nextElementSibling(): Token | undefined {
		const childNodes = this.parentNode?.childNodes;
		return childNodes?.slice(childNodes.indexOf(this as AstNode as AstNodes) + 1)
			.find((child): child is Token => child.type !== 'text');
	}

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

	/** whether to be connected to a root token / 是否具有根节点 */
	get isConnected(): boolean {
		return this.getRootNode().type === 'root';
	}

	/** whether to be the end of a document / 后方是否还有其他节点（不含后代） */
	get eof(): boolean | undefined {
		const {parentNode} = this;
		if (!parentNode) {
			return true;
		}
		let {nextSibling} = this;
		while (nextSibling?.type === 'text' && !nextSibling.data.trim()) {
			({nextSibling} = nextSibling);
		}
		return nextSibling === undefined && parentNode.eof;
	}

	/** line number relative to its parent / 相对于父容器的行号 */
	get offsetTop(): number {
		return this.#getPosition().top;
	}

	/** column number of the last line relative to its parent / 相对于父容器的列号 */
	get offsetLeft(): number {
		return this.#getPosition().left;
	}

	/** position, dimension and paddings / 位置、大小和padding */
	get style(): Position & Dimension & {padding: number} {
		return {
			...this.#getPosition(),
			...this.getDimension(),
			padding: this.getAttribute('padding'),
		};
	}

	/** @private */
	get fixed(): boolean {
		return false;
	}

	/**
	 * font weigth and style
	 *
	 * 字体样式
	 * @since v.1.8.0
	 */
	get font(): Font {
		const {bold, italic, b = 0, i = 0} = this.#getFont();
		return {bold: bold && b >= 0, italic: italic && i >= 0};
	}

	/**
	 * whether to be bold
	 *
	 * 是否粗体
	 * @since v.1.8.0
	 */
	get bold(): boolean {
		return this.font.bold;
	}

	/**
	 * whether to be italic
	 *
	 * 是否斜体
	 * @since v.1.8.0
	 */
	get italic(): boolean {
		return this.font.italic;
	}

	constructor() {
		if (!Parser.viewOnly && !Shadow.internal) {
			Object.defineProperty(this, 'childNodes', {writable: false});
			Object.freeze(this.childNodes);
		}
	}

	/* NOT FOR BROWSER END */

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
				LINT: {
					if (Parser.viewOnly) {
						this.#aIndex = [Shadow.rev, value as TokenAttribute<'aIndex'>];
					}
				}
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

	/**
	 * Convert the position to the character index
	 *
	 * 将行列号转换为字符位置
	 * @param top line number / 行号
	 * @param left column number / 列号
	 */
	indexFromPos(top: number, left: number): number | undefined {
		LSP: {
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
		LINT: {
			const {length} = String(this);
			index += index < 0 ? length : 0;
			if (index >= 0 && index <= length) {
				const lines = this.getLines(),
					top = findIndex(lines, index, ([,, end], needle) => end - needle);
				return {top, left: index - lines[top]![1]};
			}
			return undefined;
		}
	}

	/** @private */
	getDimension(): Dimension {
		LINT: {
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
		if (j === undefined) {
			const {parentNode} = this;
			return parentNode
				? parentNode.getRelativeIndex(parentNode.childNodes.indexOf(this as AstNode as AstNodes))
				: 0;
		}

		/* NOT FOR BROWSER */

		this.verifyChild(j, 1);

		/* NOT FOR BROWSER END */

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

	/**
	 * Get the absolute character index of the current node
	 *
	 * 获取当前节点的绝对位置
	 */
	getAbsoluteIndex(): number {
		// 也用于Prism-Wiki
		return cache<number>(
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
		LINT: {
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
		/* NOT FOR BROWSER */

		if (Shadow.internal) {
			return;
		} else if (!permanent) {
			this.#optional.add(key);
		}

		/* NOT FOR BROWSER END */

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

	/* PRINT ONLY END */

	/* NOT FOR BROWSER */

	/* istanbul ignore next */
	/** @private */
	typeError(method: string, ...types: string[]): never {
		throw new TypeError(
			`${this.constructor.name}.${method} method only accepts ${
				types.join(', ')
			} as input parameters!`,
		);
	}

	/** @private */
	constructorError(msg: string): never {
		throw new Error(`${this.constructor.name} ${msg}!`);
	}

	/**
	 * Check if the node is identical
	 *
	 * 是否是全同节点
	 * @param node node to be compared to / 待比较的节点
	 * @throws `assert.AssertionError`
	 */
	isEqualNode(node: AstNode): boolean {
		try {
			assert.deepEqual(this, node);
		} catch (e) {
			if (e instanceof assert.AssertionError) {
				return false;
			}
			/* istanbul ignore next */
			throw e;
		}
		return true;
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
	 * @param ownLine whether to remove the current line if it is empty / 是否删除所在的空行
	 */
	remove(ownLine?: boolean): void {
		const {parentNode, nextSibling, previousSibling} = this,
			i = parentNode?.childNodes.indexOf(this as AstNode as AstNodes);
		parentNode?.removeAt(i!);
		if (
			ownLine
			&& parentNode?.getGaps(i! - 1) === 0
			&& nextSibling?.type === 'text' && previousSibling?.type === 'text'
			&& nextSibling.data.startsWith('\n') && previousSibling.data.endsWith('\n')
		) {
			nextSibling.deleteData(0, 1);
		}
	}

	/**
	 * Replace the current node with new nodes
	 *
	 * 将当前节点批量替换为新的节点
	 * @param nodes nodes to be inserted / 插入节点
	 */
	replaceWith(...nodes: (AstNodes | string)[]): void {
		this.insertAdjacent(nodes, 1);
		this.remove();
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

	/** @private */
	verifyChild(i: number, addition = 0): void {
		const {length} = this.childNodes;
		/* istanbul ignore if */
		if (i < -length || i >= length + addition) {
			throw new RangeError(`The child node at position ${i} does not exist!`);
		}
	}

	/**
	 * Add an event listener
	 *
	 * 添加事件监听
	 * @param types event type / 事件类型
	 * @param listener listener function / 监听函数
	 * @param options options / 选项
	 * @param options.once to be executed only once / 仅执行一次
	 */
	addEventListener(types: string | string[], listener: (...args: any[]) => void, options?: {once?: boolean}): void {
		if (Array.isArray(types)) {
			for (const type of types) {
				this.addEventListener(type, listener, options);
			}
		} else {
			this.#events[options?.once ? 'once' : 'on'](types, listener);
		}
	}

	/**
	 * Remove an event listener
	 *
	 * 移除事件监听
	 * @param types event type / 事件类型
	 * @param listener listener function / 监听函数
	 */
	removeEventListener(types: string | string[], listener: (...args: any[]) => void): void {
		if (Array.isArray(types)) {
			for (const type of types) {
				this.removeEventListener(type, listener);
			}
		} else {
			this.#events.off(types, listener);
		}
	}

	/**
	 * Remove all event listeners
	 *
	 * 移除事件的所有监听
	 * @param types event type / 事件类型
	 */
	removeAllEventListeners(types: string | string[]): void {
		if (Array.isArray(types)) {
			for (const type of types) {
				this.removeAllEventListeners(type);
			}
		} else if (typeof types === 'string') {
			this.#events.removeAllListeners(types);
		}
	}

	/**
	 * List all event listeners
	 *
	 * 列举事件监听
	 * @param type event type / 事件类型
	 */
	listEventListeners(type: string): Function[] {
		return this.#events.listeners(type);
	}

	/**
	 * Dispatch an event
	 *
	 * 触发事件
	 * @param e event object / 事件对象
	 * @param data event data / 事件数据
	 */
	dispatchEvent(e: Event, data: unknown): void {
		if (!e.target) { // 初始化
			Object.defineProperty(e, 'target', {value: this, enumerable: true});
		}
		Object.defineProperties(e, { // 每次bubble更新
			prevTarget: {value: e.currentTarget, enumerable: true, configurable: true},
			currentTarget: {value: this, enumerable: true, configurable: true},
		});
		this.#events.emit(e.type, e, data);
		if (e.bubbles && !(e.cancelBubble as unknown as boolean) && this.parentNode) {
			this.parentNode.dispatchEvent(e, data);
		}
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

	/**
	 * Compare the relative position with another node
	 *
	 * 比较和另一个节点的相对位置
	 * @param other node to be compared with / 待比较的节点
	 * @throws `RangeError` 不在同一个语法树
	 */
	compareDocumentPosition(other: AstNodes): number {
		if ((this as AstNode as AstNodes) === other) {
			return 0;
		} else if (this.contains(other)) {
			return -1;
		} else if (other.contains(this)) {
			return 1;
		} else /* istanbul ignore if */ if (this.getRootNode() !== other.getRootNode()) {
			throw new RangeError('Nodes to be compared are not in the same document!');
		}
		const aAncestors = [...this.getAncestors().reverse(), this as AstNode as AstNodes],
			bAncestors = [...other.getAncestors().reverse(), other],
			depth = aAncestors.findIndex((ancestor, i) => bAncestors[i] !== ancestor),
			{childNodes} = aAncestors[depth - 1]!;
		return childNodes.indexOf(aAncestors[depth]!) - childNodes.indexOf(bAncestors[depth]!);
	}

	/** 获取当前节点的相对位置 */
	#getPosition(): Position {
		return this.parentNode?.posFromIndex(this.getRelativeIndex()) ?? {top: 0, left: 0};
	}

	/**
	 * Destroy the instance
	 *
	 * 销毁
	 */
	destroy(): void {
		this.parentNode?.destroy();
		for (const child of this.childNodes) {
			child.setAttribute('parentNode', undefined);
		}
		Object.setPrototypeOf(this, null);
	}

	/**
	 * Get the wikitext of a line
	 *
	 * 获取某一行的wikitext
	 * @param n line number / 行号
	 */
	getLine(n: number): string | undefined {
		return this.getLines()[n]?.[0];
	}

	/** 字体样式 */
	#getFont(): Font & {b?: number, i?: number} {
		const {parentNode} = this,
			acceptable = parentNode?.getAcceptable();
		if (!parentNode || acceptable && !('QuoteToken' in acceptable)) {
			return {bold: false, italic: false};
		}
		const {childNodes, type} = parentNode;
		let bold: boolean | undefined,
			italic: boolean | undefined,
			b = 0,
			i = 0;

		/**
		 * 更新字体样式
		 * @param node 父节点或兄弟节点
		 */
		const update = (node: AstNodes): void => {
			const font = node.#getFont();
			if (bold === undefined) {
				({bold} = font);
				b += font.b ?? 0;
			}
			if (italic === undefined) {
				({italic} = font);
				i += font.i ?? 0;
			}
		};
		for (let j = childNodes.indexOf(this as unknown as AstNodes) - 1; j >= 0; j--) {
			const child = childNodes[j]!;
			if (child.is<QuoteToken>('quote')) {
				const {closing} = child;
				bold ??= closing.bold === undefined ? undefined : !closing.bold;
				italic ??= closing.italic === undefined ? undefined : !closing.italic;
				if (bold !== undefined && italic !== undefined) {
					break;
				}
			} else if (child.is<HtmlToken>('html')) {
				const {name, closing} = child;
				if (bold === undefined && name === 'b' && b <= 0) {
					b += closing ? -1 : 1;
				} else if (italic === undefined && name === 'i' && i <= 0) {
					i += closing ? -1 : 1;
				}
			} else if (child.is<ExtLinkToken>('ext-link') && child.length === 2 && child.lastChild.length > 0) {
				update(child.lastChild.lastChild!);
				break;
			} else if (child.type === 'text' && child.data.includes('\n')) {
				bold = Boolean(bold);
				italic = Boolean(italic);
				break;
			}
		}
		if ((bold === undefined || italic === undefined) && type === 'ext-link-text' && parentNode.parentNode) {
			update(parentNode.parentNode);
		}
		return {bold: Boolean(bold), italic: Boolean(italic), b, i};
	}
}

classes['AstNode'] = __filename;
