import * as assert from 'assert/strict';
import * as EventEmitter from 'events';
import * as Parser from '../index';
import type {AstText, Token} from '../internal';

export type AstNodes = AstText | Token;
export type TokenTypes = 'root'
	| 'plain'
	| 'onlyinclude'
	| 'noinclude'
	| 'include'
	| 'comment'
	| 'ext'
	| 'ext-attrs'
	| 'ext-attr-dirty'
	| 'ext-attr'
	| 'attr-key'
	| 'attr-value'
	| 'ext-inner'
	| 'arg'
	| 'arg-name'
	| 'arg-default'
	| 'hidden'
	| 'magic-word'
	| 'magic-word-name'
	| 'invoke-function'
	| 'invoke-module'
	| 'template'
	| 'template-name'
	| 'parameter'
	| 'parameter-key'
	| 'parameter-value'
	| 'heading'
	| 'heading-title'
	| 'heading-trail'
	| 'html'
	| 'html-attrs'
	| 'html-attr-dirty'
	| 'html-attr'
	| 'table'
	| 'tr'
	| 'td'
	| 'table-syntax'
	| 'table-attrs'
	| 'table-attr-dirty'
	| 'table-attr'
	| 'table-inter'
	| 'td-inner'
	| 'hr'
	| 'double-underscore'
	| 'link'
	| 'link-target'
	| 'link-text'
	| 'category'
	| 'file'
	| 'gallery-image'
	| 'imagemap-image'
	| 'image-parameter'
	| 'quote'
	| 'ext-link'
	| 'ext-link-text'
	| 'ext-link-url'
	| 'free-ext-link'
	| 'list'
	| 'dd'
	| 'converter'
	| 'converter-flags'
	| 'converter-flag'
	| 'converter-rule'
	| 'converter-rule-noconvert'
	| 'converter-rule-variant'
	| 'converter-rule-to'
	| 'converter-rule-from'
	| 'param-line'
	| 'imagemap-link';
export interface Dimension {
	height: number;
	width: number;
}
export interface Position {
	top: number;
	left: number;
}
export interface CaretPosition {
	offsetNode: AstNodes;
	offset: number;
}

/**
 * 定制TypeError消息
 * @param {Function} Constructor 类
 * @param method
 * @param args 可接受的参数类型
 * @throws `TypeError`
 */
const typeError = ({name}: Function, method: string, ...args: string[]): never => {
	throw new TypeError(`${name}.${method} 方法仅接受 ${args.join('、')} 作为输入参数！`);
};

/** 类似Node */
export abstract class AstNode {
	/** @browser */
	type: TokenTypes | 'text';
	/** @browser */
	readonly childNodes: AstNodes[] = [];
	/** @browser */
	#parentNode: Token | undefined;
	#optional = new Set<string>();
	#events = new EventEmitter();

	/**
	 * 首位子节点
	 * @browser
	 */
	get firstChild(): AstNodes | undefined {
		return this.childNodes[0];
	}

	/**
	 * 末位子节点
	 * @browser
	 */
	get lastChild(): AstNodes | undefined {
		return this.childNodes.at(-1);
	}

	/**
	 * 父节点
	 * @browser
	 */
	get parentNode(): Token | undefined {
		return this.#parentNode;
	}

	/**
	 * 后一个兄弟节点
	 * @browser
	 */
	get nextSibling(): AstNodes | undefined {
		const childNodes = this.#parentNode?.childNodes;
		return childNodes && childNodes[childNodes.indexOf(this as AstNode as AstNodes) + 1];
	}

	/**
	 * 前一个兄弟节点
	 * @browser
	 */
	get previousSibling(): AstNodes | undefined {
		const childNodes = this.#parentNode?.childNodes;
		return childNodes && childNodes[childNodes.indexOf(this as AstNode as AstNodes) - 1];
	}

	/**
	 * 行数
	 * @browser
	 */
	get offsetHeight(): number {
		return this.#getDimension().height;
	}

	/**
	 * 最后一行的列数
	 * @browser
	 */
	get offsetWidth(): number {
		return this.#getDimension().width;
	}

	/** 后一个非文本兄弟节点 */
	get nextElementSibling(): Token | undefined {
		const childNodes = this.#parentNode?.childNodes,
			i = childNodes?.indexOf(this as AstNode as AstNodes);
		return childNodes?.slice(i! + 1).find(({type}) => type !== 'text') as Token | undefined;
	}

	/** 前一个非文本兄弟节点 */
	get previousElementSibling(): Token | undefined {
		const childNodes = this.#parentNode?.childNodes,
			i = childNodes?.indexOf(this as AstNode as AstNodes);
		return childNodes?.slice(0, i).findLast(({type}) => type !== 'text') as Token | undefined;
	}

	/** 是否具有根节点 */
	get isConnected(): boolean {
		return this.getRootNode().type === 'root';
	}

	/** 不是自身的根节点 */
	get ownerDocument(): Token | undefined {
		const root = this.getRootNode();
		return root.type === 'root' && root !== this ? root as Token : undefined;
	}

	/** 后方是否还有其他节点（不含后代） */
	get eof(): boolean | undefined {
		if (this.type === 'root') {
			return true;
		}
		let {nextSibling} = this;
		while (nextSibling?.type === 'text' && nextSibling.data.trim() === '') {
			({nextSibling} = nextSibling);
		}
		return nextSibling === undefined && this.parentNode?.eof;
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
		return {...this.#getPosition(), ...this.#getDimension(), padding: this.getPadding()};
	}

	/** @private */
	protected get fixed(): boolean {
		return 'fixed' in this.constructor;
	}

	constructor() {
		Object.defineProperty(this, 'childNodes', {writable: false});
		Object.freeze(this.childNodes);
	}

	/** @private */
	protected hasAttribute(key: string): boolean {
		return key in this;
	}

	/** @private */
	getAttribute<T extends string>(key: T): TokenAttributeGetter<T> {
		if (key === 'optional') {
			return new Set(this.#optional) as TokenAttributeGetter<T>;
		}
		return this.hasAttribute(key)
			// @ts-expect-error noImplicitAny
			? String(this[key as string]) as TokenAttributeGetter<T>
			: undefined as TokenAttributeGetter<T>;
	}

	/** @private */
	setAttribute<T extends string>(key: T, value: TokenAttributeSetter<T>): this {
		if (key === 'parentNode') {
			this.#parentNode = value as TokenAttributeSetter<'parentNode'>;
		} else if (Object.hasOwn(this, key)) {
			const descriptor = Object.getOwnPropertyDescriptor(this, key)!;
			if (this.#optional.has(key)) {
				descriptor.enumerable = Boolean(value);
			}
			// @ts-expect-error noImplicitAny
			const oldValue = this[key as string],
				frozen = oldValue !== null && typeof oldValue === 'object' && Object.isFrozen(oldValue);
			Object.defineProperty(this, key, {...descriptor, value});
			if (frozen && typeof value === 'object') {
				Object.freeze(value);
			}
		} else {
			// @ts-expect-error noImplicitAny
			this[key as string] = value;
		}
		return this;
	}

	/**
	 * 获取根节点
	 * @browser
	 */
	getRootNode(): Token | this {
		let {parentNode} = this;
		while (parentNode?.parentNode) {
			({parentNode} = parentNode);
		}
		return parentNode ?? this;
	}

	/**
	 * 将字符位置转换为行列号
	 * @browser
	 * @param index 字符位置
	 */
	posFromIndex(index: number): Position | undefined {
		const str = String(this);
		if (index >= -str.length && index <= str.length) {
			const lines = str.slice(0, index).split('\n');
			return {top: lines.length - 1, left: lines.at(-1)!.length};
		}
		return undefined;
	}

	/**
	 * 获取行数和最后一行的列数
	 * @browser
	 */
	#getDimension(): Dimension {
		const lines = String(this).split('\n');
		return {height: lines.length, width: lines.at(-1)!.length};
	}

	/** @private */
	protected getPadding(): number {
		return 0;
	}

	/** @private */
	// eslint-disable-next-line no-unused-vars, @typescript-eslint/no-unused-vars
	protected getGaps(i: number): number {
		return 0;
	}

	/**
	 * 获取当前节点的相对字符位置，或其第`j`个子节点的相对字符位置
	 * @browser
	 * @param j 子节点序号
	 */
	getRelativeIndex(j?: number): number {
		let childNodes: AstNodes[];

		/**
		 * 获取子节点相对于父节点的字符位置，使用前需要先给`childNodes`赋值
		 * @param end 子节点序号
		 * @param parent 父节点
		 */
		const getIndex = (end: number, parent: AstNode): number =>
			childNodes.slice(0, end).reduce((acc, cur, i) => acc + String(cur).length + parent.getGaps(i), 0)
			+ parent.getPadding();
		if (j === undefined) {
			const {parentNode} = this;
			if (parentNode) {
				({childNodes} = parentNode);
				return getIndex(childNodes.indexOf(this as AstNode as AstNodes), parentNode);
			}
			return 0;
		}
		this.verifyChild(j, 1);
		({childNodes} = this);
		return getIndex(j, this);
	}

	/**
	 * 获取当前节点的绝对位置
	 * @browser
	 */
	getAbsoluteIndex(): number {
		const {parentNode} = this;
		return parentNode ? parentNode.getAbsoluteIndex() + this.getRelativeIndex() : 0;
	}

	/** @private */
	protected typeError(method: string, ...types: string[]): never {
		return typeError(this.constructor, method, ...types);
	}

	/** @private */
	protected seal(key: string): void {
		this.#optional.add(key);
		// @ts-expect-error noImplicitAny
		Object.defineProperty(this, key, {writable: false, enumerable: Boolean(this[key]), configurable: true});
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
	#insertAdjacent(nodes: (AstNodes | string)[], offset: number): void {
		const {parentNode} = this;
		if (!parentNode) {
			throw new Error('不存在父节点！');
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

	/**
	 * 移除当前节点
	 * @throws `Error` 不存在父节点
	 */
	remove(): void {
		const {parentNode} = this;
		if (!parentNode) {
			throw new Error('不存在父节点！');
		}
		parentNode.removeChild(this as AstNode as AstNodes);
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
	protected verifyChild(i: number, addition = 0): void {
		const {childNodes: {length}} = this;
		if (i < -length || i >= length + addition) {
			throw new RangeError(`不存在第 ${i} 个子节点！`);
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
	removeAllEventListeners(types?: string | string[]): void {
		if (Array.isArray(types)) {
			for (const type of types) {
				this.removeAllEventListeners(type);
			}
		} else {
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

			/** 终止冒泡 */
			e.stopPropagation = function(): void {
				Object.defineProperty(this, 'bubbles', {value: false});
			};
		}
		Object.defineProperties(e, { // 每次bubble更新
			prevTarget: {value: e.currentTarget, enumerable: true, configurable: true},
			currentTarget: {value: this, enumerable: true, configurable: true},
		});
		this.#events.emit(e.type, e, data);
		if (e.bubbles && this.parentNode) {
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
	 * @throws `Error` 不在同一个语法树
	 */
	compareDocumentPosition(other: AstNodes): number {
		if ((this as AstNode as AstNodes) === other) {
			return 0;
		} else if (this.contains(other)) {
			return -1;
		} else if (other.contains(this)) {
			return 1;
		} else if (this.getRootNode() !== other.getRootNode()) {
			throw new Error('不在同一个语法树！');
		}
		const aAncestors = [...this.getAncestors().reverse(), this as AstNode as AstNodes],
			bAncestors = [...other.getAncestors().reverse(), other],
			depth = aAncestors.findIndex((ancestor, i) => bAncestors[i] !== ancestor),
			commonAncestor = aAncestors[depth - 1]!,
			{childNodes} = commonAncestor;
		return childNodes.indexOf(aAncestors[depth]!) - childNodes.indexOf(bAncestors[depth]!);
	}

	/**
	 * 将行列号转换为字符位置
	 * @param top 行号
	 * @param left 列号
	 */
	indexFromPos(top: number, left: number): number | undefined {
		const lines = String(this).split('\n');
		return top >= 0 && left >= 0 && lines.length >= top + 1 && lines[top]!.length >= left
			? lines.slice(0, top).reduce((acc, curLine) => acc + curLine.length + 1, 0) + left
			: undefined;
	}

	/** 获取当前节点的相对位置 */
	#getPosition(): Position {
		return this.parentNode?.posFromIndex(this.getRelativeIndex()) ?? {top: 0, left: 0};
	}

	/** 获取当前节点的行列位置和大小 */
	getBoundingClientRect(): Dimension & Position {
		return {...this.#getDimension(), ...this.getRootNode().posFromIndex(this.getAbsoluteIndex())!};
	}
}

Parser.classes['AstNode'] = __filename;
