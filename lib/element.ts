import {
	text,
	print,
} from '../util/string';
import {setChildNodes} from '../util/debug';
import {AstNode} from './node';
import type {
	LintError,
	AST,
} from '../base';
import type {AstNodes, AstText, Token} from '../internal';

/* NOT FOR BROWSER */

import * as fs from 'fs';
import * as path from 'path';
import {classes} from '../util/constants';
import {checkToken} from '../parser/selector';

/* NOT FOR BROWSER END */

// @ts-expect-error unconstrained predicate
declare type TokenPredicate<T = Token> = (token: Token) => token is T;

/**
 * 将选择器转化为类型谓词
 * @param selector 选择器
 */
const getCondition = <T>(selector: string): TokenPredicate<T> => {
	/* NOT FOR BROWSER */

	if (/[^a-z\-,\s]/u.test(selector)) {
		return checkToken(selector) as TokenPredicate<T>;
	}

	/* NOT FOR BROWSER END */

	const types = new Set(selector.split(',').map(str => str.trim()));
	return (({type}) => types.has(type)) as TokenPredicate<T>;
};

/** 类似HTMLElement */
export abstract class AstElement extends AstNode {
	declare readonly name?: string;
	declare readonly data: undefined;

	/** 子节点总数 */
	get length(): number {
		return this.childNodes.length;
	}

	/* NOT FOR BROWSER */

	set length(n) {
		if (n >= 0 && n < this.length) {
			for (let i = this.length - 1; i >= n; i--) {
				this.removeAt(i);
			}
		}
	}

	/** 全部非文本子节点 */
	get children(): Token[] {
		return this.childNodes.filter((child): child is Token => child.type !== 'text');
	}

	/** 首位非文本子节点 */
	get firstElementChild(): Token | undefined {
		return this.childNodes.find((child): child is Token => child.type !== 'text');
	}

	/** 末位非文本子节点 */
	get lastElementChild(): Token | undefined {
		return this.children[this.childElementCount - 1];
	}

	/** 非文本子节点总数 */
	get childElementCount(): number {
		return this.children.length;
	}

	/** 父节点 */
	get parentElement(): Token | undefined {
		return this.parentNode;
	}

	/** AstElement.prototype.text()的getter写法 */
	get outerText(): string {
		return this.text();
	}

	/** 不可见 */
	get hidden(): boolean {
		return this.text() === '';
	}

	/** 内部高度 */
	get clientHeight(): number | undefined {
		const {innerText} = this as {innerText?: string};
		return typeof innerText === 'string' ? innerText.split('\n').length : undefined;
	}

	/** 内部宽度 */
	get clientWidth(): number | undefined {
		const {innerText} = this as {innerText?: string};
		if (typeof innerText === 'string') {
			const lines = innerText.split('\n');
			return lines.at(-1)!.length;
		}
		return undefined;
	}

	constructor() {
		super();
		this.seal('name');
	}

	/* NOT FOR BROWSER END */

	/** @private */
	text(separator?: string): string {
		return text(this.childNodes, separator);
	}

	/** 合并相邻的文本子节点 */
	normalize(): void {
		const childNodes = [...this.childNodes];

		/**
		 * 移除子节点
		 * @param i 移除位置
		 */
		const remove = (i: number): void => {
			childNodes[i]!.setAttribute('parentNode', undefined);
			childNodes.splice(i, 1);
		};
		for (let i = childNodes.length - 1; i >= 0; i--) {
			const {type, data} = childNodes[i]!;
			if (type !== 'text' || this.getGaps(i - 1)) {
				//
			} else if (data === '') {
				remove(i);

				/* NOT FOR BROWSER */
			} else {
				const prev = childNodes[i - 1];
				if (prev?.type === 'text') {
					prev.setAttribute('data', prev.data + data);
					remove(i);
				}

				/* NOT FOR BROWSER END */
			}
		}
		this.setAttribute('childNodes', childNodes);
	}

	/**
	 * 移除子节点
	 * @param i 移除位置
	 */
	removeAt(i: number): AstNodes {
		/* NOT FOR BROWSER */

		this.verifyChild(i);

		/* NOT FOR BROWSER END */

		return setChildNodes(this as AstElement as Token, i, 1)[0]!;
	}

	/**
	 * 插入子节点
	 * @param node 待插入的子节点
	 * @param i 插入位置
	 * @throws `RangeError` 不能插入祖先或子节点
	 */
	insertAt<T extends AstNodes>(node: T, i = this.length): T {
		/* NOT FOR BROWSER */

		if (node.contains(this)) {
			throw new RangeError('Cannot insert an ancestor node!');
		} else if (this.childNodes.includes(node)) {
			throw new RangeError('Cannot insert its own child node!');
		}
		this.verifyChild(i, 1);
		node.parentNode?.removeChild(node);

		/* NOT FOR BROWSER END */

		setChildNodes(this as AstElement as Token, i, 0, [node]);
		return node;
	}

	/**
	 * 最近的祖先节点
	 * @param selector 选择器
	 */
	closest<T = Token>(selector: string): T | undefined {
		const condition = getCondition<T>(selector);
		let {parentNode} = this;
		while (parentNode) {
			if (condition(parentNode)) {
				return parentNode;
			}
			({parentNode} = parentNode);
		}
		return undefined;
	}

	/**
	 * 符合条件的第一个后代节点
	 * @param condition 条件
	 */
	#getElementBy<T>(condition: TokenPredicate<T>): T | undefined {
		for (const child of this.childNodes) {
			if (child.type === 'text') {
				continue;
			} else if (condition(child)) {
				return child;
			}
			const descendant = child.#getElementBy(condition);
			if (descendant) {
				return descendant;
			}
		}
		return undefined;
	}

	/**
	 * 符合选择器的第一个后代节点
	 * @param selector 选择器
	 */
	querySelector<T = Token>(selector: string): T | undefined {
		const condition = getCondition<T>(selector);
		return this.#getElementBy(condition);
	}

	/**
	 * 符合条件的所有后代节点
	 * @param condition 条件
	 */
	#getElementsBy<T>(condition: TokenPredicate<T>): T[] {
		const descendants: T[] = [];
		for (const child of this.childNodes) {
			if (child.type === 'text') {
				continue;
			} else if (condition(child)) {
				descendants.push(child);
			}
			descendants.push(...child.#getElementsBy(condition));
		}
		return descendants;
	}

	/**
	 * 符合选择器的所有后代节点
	 * @param selector 选择器
	 */
	querySelectorAll<T = Token>(selector: string): T[] {
		const condition = getCondition<T>(selector);
		return this.#getElementsBy(condition);
	}

	/**
	 * 在末尾批量插入子节点
	 * @param elements 插入节点
	 */
	append(...elements: (AstNodes | string)[]): void {
		for (const element of elements) {
			this.insertAt(element as AstNodes);
		}
	}

	/**
	 * 批量替换子节点
	 * @param elements 新的子节点
	 */
	replaceChildren(...elements: (AstNodes | string)[]): void {
		for (let i = this.length - 1; i >= 0; i--) {
			this.removeAt(i);
		}
		this.append(...elements);
	}

	/**
	 * 修改文本子节点
	 * @param str 新文本
	 * @param i 子节点位置
	 * @throws `RangeError` 对应位置的子节点不是文本节点
	 */
	setText(str: string, i = 0): string {
		i += i < 0 ? this.length : 0;

		/* NOT FOR BROWSER */

		this.verifyChild(i);

		/* NOT FOR BROWSER END */

		const oldText = this.childNodes[i] as AstText;
		if (oldText.type === 'text') { // eslint-disable-line @typescript-eslint/no-unnecessary-condition
			const {data} = oldText;
			oldText.replaceData(str);
			return data;
		}

		/* NOT FOR BROWSER */

		throw new RangeError(`The child node at position ${i} is ${oldText.constructor.name}!`);
	}

	/** @private */
	override toString(skip?: boolean, separator = ''): string {
		return this.childNodes.map(child => child.toString(skip)).join(separator);
	}

	/** @private */
	lint(start = this.getAbsoluteIndex(), re?: RegExp | false): LintError[] {
		const errors: LintError[] = [];
		for (let i = 0, cur = start + this.getAttribute('padding'); i < this.length; i++) {
			const child = this.childNodes[i]!;
			errors.push(...child.lint(cur, re));
			cur += child.toString().length + this.getGaps(i);
		}
		return errors;
	}

	/** @private */
	print(opt: PrintOpt = {}): string {
		const cl = opt.class;
		return this.toString()
			? `${
				cl === '' ? '' : `<span class="wpb-${cl ?? this.type}">`
			}${print(this.childNodes, opt)}${cl === '' ? '' : '</span>'}`
			: '';
	}

	/**
	 * 保存为JSON
	 * @param file 文件名
	 * @param start
	 */
	json(file?: string, start = this.getAbsoluteIndex()): AST {
		const json = {
			...this,
			type: this.type,
			range: [start, start + this.toString().length],
			childNodes: [],
		} as unknown as AST;
		for (let i = 0, cur = start + this.getAttribute('padding'); i < this.length; i++) {
			const child = this.childNodes[i]!,
				{length} = child.toString();
			json.childNodes!.push(
				child.type === 'text'
					? {data: child.data, range: [cur, cur + length]} as unknown as AST
					: child.json(undefined, cur),
			);
			cur += length + this.getGaps(i);
		}

		/* NOT FOR BROWSER */

		if (typeof file === 'string') {
			fs.writeFileSync(
				path.join(__dirname, '..', '..', 'printed', file + (file.endsWith('.json') ? '' : '.json')),
				JSON.stringify(json, null, 2),
			);
		}

		/* NOT FOR BROWSER END */

		return json;
	}

	/* NOT FOR BROWSER */

	/**
	 * 检查是否符合选择器
	 * @param selector 选择器
	 */
	matches<T>(selector?: string): this is T {
		return selector === undefined || getCondition<T>(selector)(this as AstElement as Token);
	}

	/**
	 * 类型选择器
	 * @param types
	 */
	getElementByTypes<T = Token>(types: string): T | undefined {
		const typeSet = new Set(types.split(',').map(str => str.trim()));
		return this.#getElementBy((({type}) => typeSet.has(type)) as TokenPredicate<T>);
	}

	/**
	 * id选择器
	 * @param id id名
	 */
	getElementById<T = Token>(id: string): T | undefined {
		return this.#getElementBy((token => 'id' in token && token.id === id) as TokenPredicate<T>);
	}

	/**
	 * 类选择器
	 * @param className 类名之一
	 */
	getElementsByClassName<T = Token>(className: string): T[] {
		return this.#getElementsBy(
			(token => 'classList' in token && (token.classList as Set<string>).has(className)) as TokenPredicate<T>,
		);
	}

	/**
	 * 标签名选择器
	 * @param tag 标签名
	 */
	getElementsByTagName<T = Token>(tag: string): T[] {
		return this.#getElementsBy<T>(
			(({type, name}) => name === tag && (type === 'html' || type === 'ext')) as TokenPredicate<T>,
		);
	}

	/**
	 * 在开头批量插入子节点
	 * @param elements 插入节点
	 */
	prepend(...elements: (AstNodes | string)[]): void {
		for (let i = 0; i < elements.length; i++) {
			this.insertAt(elements[i] as AstNodes, i);
		}
	}

	/**
	 * 获取子节点的位置
	 * @param node 子节点
	 * @throws `RangeError` 找不到子节点
	 */
	#getChildIndex(node: AstNodes): number {
		const i = this.childNodes.indexOf(node);
		if (i === -1) {
			throw new RangeError('Not a child node!');
		}
		return i;
	}

	/**
	 * 移除子节点
	 * @param node 子节点
	 */
	removeChild<T extends AstNodes>(node: T): T {
		return this.removeAt(this.#getChildIndex(node)) as T;
	}

	/**
	 * 在指定位置前插入子节点
	 * @param child 插入节点
	 * @param reference 指定位置处的子节点
	 */
	insertBefore(child: string, reference?: AstNodes): AstText;
	insertBefore<T extends AstNodes>(child: T, reference?: AstNodes): T;
	insertBefore<T extends AstNodes>(child: T | string, reference?: AstNodes): T | AstText {
		return reference === undefined
			? this.insertAt(child as T)
			: this.insertAt(child as T, this.#getChildIndex(reference));
	}
}

classes['AstElement'] = __filename;
