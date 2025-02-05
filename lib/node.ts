/* eslint-disable @typescript-eslint/no-base-to-string */
import type {LintError, AstNode as AstNodeBase, TokenTypes} from '../base';
import type {
	AstText,
	Token,

	/* NOT FOR BROWSER */

	QuoteToken,
} from '../internal';

/* NOT FOR BROWSER */

import * as assert from 'assert/strict';
import * as EventEmitter from 'events';
import {classes} from '../util/constants';
import {typeError} from '../util/debug';

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

/**
 * 计算字符串的行列数
 * @param str 字符串
 */
const getDimension = (str: string): Dimension => {
	const lines = str.split('\n'),
		height = lines.length;
	return {height, width: lines[height - 1]!.length};
};

/**
 * 获取子节点相对于父节点的字符位置
 * @param j 子节点序号
 * @param parent 父节点
 */
const getIndex = (j: number, parent: AstNode): number =>
	parent.childNodes.slice(0, j).reduce((acc, cur, i) => acc + cur.toString().length + parent.getGaps(i), 0)
	+ parent.getAttribute('padding');

/** 类似Node */
export abstract class AstNode implements AstNodeBase {
	declare data?: string | undefined;
	readonly childNodes: readonly AstNodes[] = [];
	#parentNode: Token | undefined;

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
		const childNodes = this.parentNode?.childNodes;
		return childNodes?.[childNodes.indexOf(this as AstNode as AstNodes) + 1];
	}

	/** 前一个兄弟节点 */
	get previousSibling(): AstNodes | undefined {
		const childNodes = this.parentNode?.childNodes;
		return childNodes?.[childNodes.indexOf(this as AstNode as AstNodes) - 1];
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
		const childNodes = this.parentNode?.childNodes,
			i = childNodes?.indexOf(this as AstNode as AstNodes);
		return childNodes?.slice(i! + 1).find((child): child is Token => child.type !== 'text');
	}

	/** 前一个非文本兄弟节点 */
	get previousElementSibling(): Token | undefined {
		const childNodes = this.parentNode?.childNodes,
			i = childNodes?.indexOf(this as AstNode as AstNodes);
		return childNodes?.slice(0, i).reverse().find((child): child is Token => child.type !== 'text');
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
	get font(): {bold: boolean, italic: boolean} {
		const {parentNode} = this,
			acceptable = parentNode?.getAcceptable();
		if (!parentNode || acceptable && !('QuoteToken' in acceptable)) {
			return {bold: false, italic: false};
		}
		const {childNodes, type} = parentNode;
		let {bold = false, italic = false} = type === 'ext-link-text' && parentNode.parentNode || {};
		for (let i = childNodes.indexOf(this as unknown as AstNodes) - 1; i >= 0; i--) {
			const child = childNodes[i]!;
			if (child.is<QuoteToken>('quote')) {
				bold = child.bold !== bold;
				italic = child.italic !== italic;
			} else if (child.type === 'text' && child.data.includes('\n')) {
				break;
			}
		}
		return {bold, italic};
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
		Object.freeze(this.childNodes);
	}

	/* NOT FOR BROWSER END */

	/** @private */
	getAttribute<T extends string>(key: T): TokenAttribute<T> {
		return (key === 'padding' ? 0 : this[key as keyof this]) as TokenAttribute<T>;
	}

	/** @private */
	setAttribute<T extends string>(key: T, value: TokenAttribute<T>): void {
		if (key === 'parentNode') {
			this.#parentNode = value as TokenAttribute<'parentNode'>;

			/* NOT FOR BROWSER */
		} else if (Object.hasOwn(this, key)) {
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

			/* NOT FOR BROWSER END */
		} else {
			this[key as keyof this] = value as any; // eslint-disable-line @typescript-eslint/no-explicit-any
		}
	}

	/** 获取根节点 */
	getRootNode(): Token | this {
		let {parentNode} = this;
		while (parentNode?.parentNode) {
			({parentNode} = parentNode);
		}
		return parentNode ?? this;
	}

	/**
	 * 将行列号转换为字符位置
	 * @param top 行号
	 * @param left 列号
	 */
	indexFromPos(top: number, left: number): number | undefined {
		const lines = String(this).split('\n');
		return top >= 0 && left >= 0 && top <= lines.length - 1 && left <= lines[top]!.length
			? lines.slice(0, top).reduce((acc, cur) => acc + cur.length + 1, 0) + left
			: undefined;
	}

	/**
	 * 将字符位置转换为行列号
	 * @param index 字符位置
	 */
	posFromIndex(index: number): Position | undefined {
		const str = String(this);
		if (index >= -str.length && index <= str.length) {
			const {height, width} = getDimension(str.slice(0, index));
			return {top: height - 1, left: width};
		}
		return undefined;
	}

	/** 获取行数和最后一行的列数 */
	#getDimension(): Dimension {
		return getDimension(String(this));
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
			return parentNode ? getIndex(parentNode.childNodes.indexOf(this as AstNode as AstNodes), parentNode) : 0;
		}

		/* NOT FOR BROWSER */

		this.verifyChild(j, 1);

		/* NOT FOR BROWSER END */

		return getIndex(j, this);
	}

	/** 获取当前节点的绝对位置 */
	getAbsoluteIndex(): number {
		const {parentNode} = this;
		return parentNode ? parentNode.getAbsoluteIndex() + this.getRelativeIndex() : 0;
	}

	/** 获取当前节点的行列位置和大小 */
	getBoundingClientRect(): Dimension & Position {
		return {...this.#getDimension(), ...this.getRootNode().posFromIndex(this.getAbsoluteIndex())!};
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
	is<T extends Token>(type: string): this is T {
		return this.type === type;
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
		return node === this || this.childNodes.some(child => child.contains(node));
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
		return String(this).split('\n', n + 1)[n];
	}
}

classes['AstNode'] = __filename;
