/* eslint-disable @typescript-eslint/no-base-to-string */
import {cache} from '../util/lint';
import {
	Shadow,

	/* NOT FOR BROWSER */

	typeError,
} from '../util/debug';
import type {LintError, AstNode as AstNodeBase, TokenTypes} from '../base';
import type {Cached} from '../util/lint';
import type {
	AstText,
	Token,

	/* NOT FOR BROWSER */

	QuoteToken,
	ExtLinkToken,
	HtmlToken,
} from '../internal';

/* NOT FOR BROWSER */

import * as assert from 'assert/strict';
import * as EventEmitter from 'events';
import {classes} from '../util/constants';
import Parser from '../index';

export interface Font {
	bold: boolean;
	italic: boolean;
}

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

/** 类似Node */
export abstract class AstNode implements AstNodeBase {
	declare data?: string | undefined;
	readonly childNodes: readonly AstNodes[] = [];
	#parentNode: Token | undefined;
	#nextSibling: AstNodes | undefined;
	#previousSibling: AstNodes | undefined;
	#lines: Cached<[string, number, number][]> | undefined;
	#root: Cached<Token | this> | undefined;
	#aIndex: Cached<number> | undefined;
	#rIndex: Record<number, Cached<number>> = {};

	/* NOT FOR BROWSER */

	readonly #optional = new Set<string>();
	readonly #events = new EventEmitter();

	/* NOT FOR BROWSER END */

	abstract get type(): TokenTypes | 'text';
	abstract set type(value);

	/** 可见部分 */
	abstract text(): string;
	abstract lint(): LintError[];
	abstract print(): string;

	/** 首位子节点 */
	get firstChild(): AstNodes | undefined {
		return this.childNodes[0];
	}

	/** 末位子节点 */
	get lastChild(): AstNodes | undefined {
		return this.childNodes[this.childNodes.length - 1];
	}

	/** 父节点 */
	get parentNode(): Token | undefined {
		return this.#parentNode;
	}

	/** 后一个兄弟节点 */
	get nextSibling(): AstNodes | undefined {
		return this.#nextSibling;
	}

	/** 前一个兄弟节点 */
	get previousSibling(): AstNodes | undefined {
		return this.#previousSibling;
	}

	/** 行数 */
	get offsetHeight(): number {
		return this.#getDimension().height;
	}

	/** 最后一行的列数 */
	get offsetWidth(): number {
		return this.#getDimension().width;
	}

	/* NOT FOR BROWSER */

	/** 后一个非文本兄弟节点 */
	get nextElementSibling(): Token | undefined {
		const childNodes = this.parentNode?.childNodes;
		return childNodes?.slice(childNodes.indexOf(this as AstNode as AstNodes) + 1)
			.find((child): child is Token => child.type !== 'text');
	}

	/** 前一个非文本兄弟节点 */
	get previousElementSibling(): Token | undefined {
		const childNodes = this.parentNode?.childNodes;
		return childNodes?.slice(0, childNodes.indexOf(this as AstNode as AstNodes))
			.findLast((child): child is Token => child.type !== 'text');
	}

	/** 后一个可见的兄弟节点 */
	get nextVisibleSibling(): AstNodes | undefined {
		let {nextSibling} = this;
		while (nextSibling?.text() === '') {
			({nextSibling} = nextSibling);
		}
		return nextSibling;
	}

	/** 前一个可见的兄弟节点 */
	get previousVisibleSibling(): AstNodes | undefined {
		let {previousSibling} = this;
		while (previousSibling?.text() === '') {
			({previousSibling} = previousSibling);
		}
		return previousSibling;
	}

	/** 是否具有根节点 */
	get isConnected(): boolean {
		return this.getRootNode().type === 'root';
	}

	/** 后方是否还有其他节点（不含后代） */
	get eof(): boolean | undefined {
		const {parentNode} = this;
		if (!parentNode) {
			return true;
		}
		let {nextSibling} = this;
		while (nextSibling?.type === 'text' && nextSibling.data.trim() === '') {
			({nextSibling} = nextSibling);
		}
		return nextSibling === undefined && parentNode.eof;
	}

	/** 相对于父容器的行号 */
	get offsetTop(): number {
		return this.#getPosition().top;
	}

	/** 相对于父容器的列号 */
	get offsetLeft(): number {
		return this.#getPosition().left;
	}

	/** 位置、大小和padding */
	get style(): Position & Dimension & {padding: number} {
		return {...this.#getPosition(), ...this.#getDimension(), padding: this.getAttribute('padding')};
	}

	/** @private */
	get fixed(): boolean {
		return false;
	}

	/** 字体样式 */
	get font(): Font {
		const {bold, italic, b = 0, i = 0} = this.#getFont();
		return {bold: bold && b >= 0, italic: italic && i >= 0};
	}

	/** 是否粗体 */
	get bold(): boolean {
		return this.font.bold;
	}

	/** 是否斜体 */
	get italic(): boolean {
		return this.font.italic;
	}

	constructor() {
		Object.defineProperty(this, 'childNodes', {writable: false});
		if (!Parser.viewOnly) {
			Object.freeze(this.childNodes);
		}
	}

	/* NOT FOR BROWSER END */

	/** @private */
	getChildNodes(): AstNodes[] {
		const {childNodes} = this;
		return Object.isFrozen(childNodes)
			|| !Parser.viewOnly
			? [...childNodes]
			: childNodes as AstNodes[];
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
			default:

				/* NOT FOR BROWSER */

				if (Object.hasOwn(this, key)) {
					const descriptor = Object.getOwnPropertyDescriptor(this, key)!;
					if (this.#optional.has(key)) {
						descriptor.enumerable = Boolean(value);
					}
					const oldValue = this[key as keyof this],
						frozen = typeof oldValue === 'object' && Object.isFrozen(oldValue);
					Object.defineProperty(this, key, {...descriptor, value});
					if (frozen && typeof value === 'object') {
						Object.freeze(value);
					}
					return;
				}

				/* NOT FOR BROWSER END */

				this[key as keyof this] = value as any; // eslint-disable-line @typescript-eslint/no-explicit-any
		}
	}

	/** 获取根节点 */
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
	 * 将行列号转换为字符位置
	 * @param top 行号
	 * @param left 列号
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
	 * 将字符位置转换为行列号
	 * @param index 字符位置
	 */
	posFromIndex(index: number): Position | undefined {
		const {length} = String(this);
		index += index < 0 ? length : 0;
		if (index >= 0 && index <= length) {
			const lines = this.getLines(),
				top = lines.findIndex(([,, end]) => index <= end);
			return {top, left: index - lines[top]![1]};
		}
		return undefined;
	}

	/** 获取行数和最后一行的列数 */
	#getDimension(): Dimension {
		const lines = this.getLines(),
			last = lines[lines.length - 1]!;
		return {height: lines.length, width: last[2] - last[1]};
	}

	/** @private */
	getGaps(_: number): number {
		return 0;
	}

	/**
	 * 获取当前节点的相对字符位置，或其第`j`个子节点的相对字符位置
	 * @param j 子节点序号
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

	/** 获取当前节点的绝对位置 */
	getAbsoluteIndex(): number {
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

	/** 获取当前节点的行列位置和大小 */
	getBoundingClientRect(): Dimension & Position {
		// eslint-disable-next-line no-unused-labels
		LSP: return {...this.#getDimension(), ...this.getRootNode().posFromIndex(this.getAbsoluteIndex())!};
	}

	/** @private */
	seal(key: string, permanent?: boolean): void {
		/* NOT FOR BROWSER */

		if (!permanent) {
			this.#optional.add(key);
		}

		/* NOT FOR BROWSER END */

		Object.defineProperty(this, key, {
			enumerable: !permanent && Boolean(this[key as keyof this]),
			configurable: true,

			/* NOT FOR BROWSER */

			writable: false,
		});
	}

	/**
	 * 是否是某种类型的节点
	 * @param type 节点类型
	 */
	is<T extends Token>(type: TokenTypes): this is T {
		return this.type === type;
	}

	/** 获取所有行的wikitext和起止位置 */
	getLines(): [string, number, number][] {
		return cache<[string, number, number][]>(
			this.#lines,
			() => {
				const results: [string, number, number][] = [];
				let start = 0;
				for (const line of String(this).split('\n')) {
					const end = start + line.length;
					results.push([line, start, end]);
					start = end + 1;
				}
				return results;
			},
			value => {
				this.#lines = value;
			},
		);
	}

	/* NOT FOR BROWSER */

	/* istanbul ignore next */
	/** @private */
	typeError(method: string, ...types: string[]): never {
		return typeError(this.constructor, method, ...types);
	}

	/** @private */
	constructorError(msg: string): never {
		throw new Error(`${this.constructor.name} ${msg}!`);
	}

	/**
	 * 是否是全同节点
	 * @param node 待比较的节点
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

	/**
	 * 在当前节点前后插入兄弟节点
	 * @param nodes 插入节点
	 * @param offset 插入的相对位置
	 * @throws `Error` 不存在父节点
	 */
	#insertAdjacent(nodes: readonly (AstNodes | string)[], offset: number): void {
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
	 * 在后方批量插入兄弟节点
	 * @param nodes 插入节点
	 */
	after(...nodes: (AstNodes | string)[]): void {
		this.#insertAdjacent(nodes, 1);
	}

	/**
	 * 在前方批量插入兄弟节点
	 * @param nodes 插入节点
	 */
	before(...nodes: (AstNodes | string)[]): void {
		this.#insertAdjacent(nodes, 0);
	}

	/** 移除当前节点 */
	remove(): void {
		this.parentNode?.removeChild(this as AstNode as AstNodes);
	}

	/**
	 * 将当前节点批量替换为新的节点
	 * @param nodes 插入节点
	 */
	replaceWith(...nodes: (AstNodes | string)[]): void {
		this.after(...nodes);
		this.remove();
	}

	/**
	 * 是自身或后代节点
	 * @param node 待检测节点
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
		const {childNodes: {length}} = this;
		/* istanbul ignore if */
		if (i < -length || i >= length + addition) {
			throw new RangeError(`The child node at position ${i} does not exist!`);
		}
	}

	/**
	 * 添加事件监听
	 * @param types 事件类型
	 * @param listener 监听函数
	 * @param options 选项
	 * @param options.once 仅执行一次
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
	 * 移除事件监听
	 * @param types 事件类型
	 * @param listener 监听函数
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
	 * 移除事件的所有监听
	 * @param types 事件类型
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
	 * 列举事件监听
	 * @param type 事件类型
	 */
	listEventListeners(type: string): Function[] {
		return this.#events.listeners(type);
	}

	/**
	 * 触发事件
	 * @param e 事件对象
	 * @param data 事件数据
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

	/** 获取所有祖先节点 */
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
	 * 比较和另一个节点的相对位置
	 * @param other 待比较的节点
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

	/** 销毁 */
	destroy(): void {
		this.parentNode?.destroy();
		for (const child of this.childNodes) {
			child.setAttribute('parentNode', undefined);
		}
		Object.setPrototypeOf(this, null);
	}

	/**
	 * 获取某一行的wikitext
	 * @param n 行号
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
