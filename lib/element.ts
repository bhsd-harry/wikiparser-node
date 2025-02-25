import {
	text,
	print,
} from '../util/string';
import {setChildNodes} from '../util/debug';
import {getCondition} from '../parser/selector';
import {AstNode} from './node';
import type {
	LintError,
	AST,
} from '../base';
import type {TokenPredicate} from '../parser/selector';
import type {
	AstNodes,
	AstText,
	Token,

	/* NOT FOR BROWSER */

	FileToken,
	LinkToken,
	RedirectTargetToken,
	ExtLinkToken,
	MagicLinkToken,
	ImageParameterToken,
	TranscludeToken,
} from '../internal';

/* NOT FOR BROWSER */

import * as fs from 'fs';
import * as path from 'path';
import {classes} from '../util/constants';

declare type LinkTokens = LinkToken | RedirectTargetToken | ExtLinkToken | MagicLinkToken | ImageParameterToken;

/* NOT FOR BROWSER END */

export interface CaretPosition {
	readonly offsetNode: AstNodes;
	readonly offset: number;
}

/**
 * HTMLElement-like
 *
 * 类似HTMLElement
 */
export abstract class AstElement extends AstNode {
	declare readonly name?: string;
	declare readonly data: undefined;

	/** number of child nodes / 子节点总数 */
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

	/** all child elements / 全部非文本子节点 */
	get children(): Token[] {
		return this.childNodes.filter((child): child is Token => child.type !== 'text');
	}

	/** first child element / 首位非文本子节点 */
	get firstElementChild(): Token | undefined {
		return this.childNodes.find((child): child is Token => child.type !== 'text');
	}

	/** last child element / 末位非文本子节点 */
	get lastElementChild(): Token | undefined {
		return this.childNodes.findLast((child): child is Token => child.type !== 'text');
	}

	/** number of child elements / 非文本子节点总数 */
	get childElementCount(): number {
		return this.children.length;
	}

	/** parent node / 父节点 */
	get parentElement(): Token | undefined {
		return this.parentNode;
	}

	/** visible text / 可见部分 */
	get outerText(): string {
		return this.text();
	}

	/** invisible / 不可见 */
	get hidden(): boolean {
		return this.text() === '';
	}

	/** height of the inner / 内部高度 */
	get clientHeight(): number | undefined {
		return (this as {innerText?: string}).innerText?.split('\n').length;
	}

	/** width of the inner / 内部宽度 */
	get clientWidth(): number | undefined {
		return (this as {innerText?: string}).innerText?.split('\n').pop()!.length;
	}

	/** all images, including gallery images / 所有图片，包括图库 */
	get images(): FileToken[] {
		return this.querySelectorAll('file,gallery-image,imagemap-image');
	}

	/** all internal, external and free external links / 所有内链、外链和自由外链 */
	get links(): LinkTokens[] {
		return this.querySelectorAll<LinkTokens>(
			'link,redirect-target,ext-link,free-ext-link,magic-link,image-parameter#link',
		).filter(({parentNode}) => parentNode?.type !== 'image-parameter' || parentNode.name !== 'link');
	}

	/** all templates and modules / 所有模板和模块 */
	get embeds(): TranscludeToken[] {
		return this.querySelectorAll('template,magic-word#invoke');
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

	/**
	 * Merge adjacent text child nodes
	 *
	 * 合并相邻的文本子节点
	 */
	normalize(): void {
		const childNodes = this.getChildNodes();

		/**
		 * 移除子节点
		 * @param i 移除位置
		 */
		const remove = (i: number): void => {
			/* NOT FOR BROWSER */

			childNodes[i]!.setAttribute('parentNode', undefined);

			/* NOT FOR BROWSER END */

			childNodes.splice(i, 1);
			childNodes[i - 1]?.setAttribute('nextSibling', childNodes[i]);
			childNodes[i]?.setAttribute('previousSibling', childNodes[i - 1]);
		};
		for (let i = childNodes.length - 1; i >= 0; i--) {
			const {type, data} = childNodes[i]!;
			if (type !== 'text' || childNodes.length === 1 || this.getGaps(i - (i && 1))) {
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
	 * Remove a child node
	 *
	 * 移除子节点
	 * @param i position of the child node / 移除位置
	 */
	removeAt(i: number): AstNodes {
		/* NOT FOR BROWSER */

		this.verifyChild(i);

		/* NOT FOR BROWSER END */

		return setChildNodes(this as AstElement as Token, i, 1)[0]!;
	}

	/**
	 * Insert a child node
	 *
	 * 插入子节点
	 * @param node node to be inserted / 待插入的子节点
	 * @param i position to be inserted at / 插入位置
	 * @throws `RangeError` 不能插入祖先或子节点
	 */
	insertAt<T extends AstNodes>(node: T, i = this.length): T {
		/* NOT FOR BROWSER */

		/* istanbul ignore next */
		if (node.contains(this)) {
			throw new RangeError('Cannot insert an ancestor node!');
		} else if (node.parentNode as this | undefined === this) {
			throw new RangeError('Cannot insert its own child node!');
		}
		this.verifyChild(i, 1);
		node.parentNode?.removeChild(node);

		/* NOT FOR BROWSER END */

		setChildNodes(this as AstElement as Token, i, 0, [node]);
		return node;
	}

	/**
	 * Get the closest ancestor node that matches the selector
	 *
	 * 最近的符合选择器的祖先节点
	 * @param selector 选择器
	 */
	closest<T = Token>(selector: string): T | undefined {
		const condition = getCondition<T>(selector, this);
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
	 * Get the first descendant that matches the selector
	 *
	 * 符合选择器的第一个后代节点
	 * @param selector 选择器
	 */
	querySelector<T = Token>(selector: string): T | undefined {
		const condition = getCondition<T>(selector, this);
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
	 * Get all descendants that match the selector
	 *
	 * 符合选择器的所有后代节点
	 * @param selector 选择器
	 */
	querySelectorAll<T = Token>(selector: string): T[] {
		const condition = getCondition<T>(selector, this);
		return this.#getElementsBy(condition);
	}

	/**
	 * Insert a batch of child nodes at the end
	 *
	 * 在末尾批量插入子节点
	 * @param elements nodes to be inserted / 插入节点
	 */
	append(...elements: (AstNodes | string)[]): void {
		for (const element of elements) {
			this.insertAt(element as AstNodes);
		}
	}

	/**
	 * Replace all child nodes
	 *
	 * 批量替换子节点
	 * @param elements nodes to be inserted / 新的子节点
	 */
	replaceChildren(...elements: (AstNodes | string)[]): void {
		for (let i = this.length - 1; i >= 0; i--) {
			this.removeAt(i);
		}
		this.append(...elements);
	}

	/**
	 * Modify the text child node
	 *
	 * 修改文本子节点
	 * @param str new text / 新文本
	 * @param i position of the text child node / 子节点位置
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

		/* istanbul ignore next */
		throw new RangeError(`The child node at position ${i} is ${oldText.constructor.name}!`);
	}

	/** @private */
	override toString(skip?: boolean, separator = ''): string {
		return this.childNodes.map(child => child.toString(skip)).join(separator);
	}

	/**
	 * Get the caret position from the character index
	 *
	 * 找到给定位置
	 * @param index character index / 位置
	 */
	caretPositionFromIndex(index?: number): CaretPosition | undefined {
		LSP: { // eslint-disable-line no-unused-labels
			if (index === undefined) {
				return undefined;
			}
			const {length} = this.toString();
			if (index > length || index < -length) {
				return undefined;
			}
			index += index < 0 ? length : 0;
			let self: AstNode = this,
				acc = 0,
				start = 0;
			while (self.type !== 'text') {
				const {childNodes} = self;
				acc += self.getAttribute('padding');
				for (let i = 0; acc <= index && i < childNodes.length; i++) {
					const cur: AstNodes = childNodes[i]!,
						{nextSibling} = cur,
						str = cur.toString(),
						l = str.length;
					cur.setAttribute('aIndex', acc);
					acc += l;
					// 优先选择靠前的非文本兄弟节点，但永不进入假节点
					if (
						acc > index
						|| acc === index && l > 0 && (
							!nextSibling
							|| nextSibling.type === 'text'
							|| cur.type !== 'text' && (str.trim() || !nextSibling.toString().trim())
						)
					) {
						self = cur;
						acc -= l;
						start = acc;
						break;
					}
					acc += self.getGaps(i);
				}
				if (self.childNodes === childNodes) {
					return {offsetNode: self as Token, offset: index - start};
				}
			}
			return {offsetNode: self as AstText, offset: index - start};
		}
	}

	/**
	 * Get the closest ancestor element from the character index
	 *
	 * 找到给定位置所在的最内层非文本节点
	 * @param index character index / 位置
	 */
	elementFromIndex(index?: number): Token | undefined {
		LSP: { // eslint-disable-line no-unused-labels
			const node = this.caretPositionFromIndex(index)?.offsetNode;
			return node?.type === 'text' ? node.parentNode : node;
		}
	}

	/**
	 * Get the closest ancestor element from the position
	 *
	 * 找到给定位置所在的最内层非文本节点
	 * @param x column number / 列数
	 * @param y line number / 行数
	 */
	elementFromPoint(x: number, y: number): Token | undefined {
		// eslint-disable-next-line no-unused-labels
		LSP: return this.elementFromIndex(this.indexFromPos(y, x));
	}

	/** @private */
	lint(start = this.getAbsoluteIndex(), re?: RegExp | false): LintError[] {
		const errors: LintError[] = [];
		for (let i = 0, cur = start + this.getAttribute('padding'); i < this.length; i++) {
			const child = this.childNodes[i]!;
			child.setAttribute('aIndex', cur);
			errors.push(...child.lint(cur, re));
			cur += child.toString().length + this.getGaps(i);
		}
		return errors;
	}

	/** @private */
	print(opt: PrintOpt = {}): string {
		const cl = opt.class;
		return this.toString()
			? (cl === '' ? '' : `<span class="wpb-${cl ?? this.type}">`)
			+ print(this.childNodes, opt)
			+ (cl === '' ? '' : '</span>')
			: '';
	}

	/**
	 * Save in JSON format
	 *
	 * 保存为JSON
	 * @param file file name / 文件名
	 * @param start
	 */
	json(file?: string, start = this.getAbsoluteIndex()): AST {
		const json = {
			...this, // eslint-disable-line @typescript-eslint/no-misused-spread
			type: this.type,
			range: [start, start + this.toString().length],
			childNodes: [],
		} as unknown as AST;
		for (let i = 0, cur = start + this.getAttribute('padding'); i < this.length; i++) {
			const child = this.childNodes[i]!,
				{length} = child.toString();
			child.setAttribute('aIndex', cur);
			json.childNodes!.push(
				child.type === 'text'
					? {data: child.data, range: [cur, cur + length]} as unknown as AST
					: child.json(undefined, cur),
			);
			cur += length + this.getGaps(i);
		}

		/* NOT FOR BROWSER */

		/* istanbul ignore if */
		if (typeof file === 'string') {
			fs.writeFileSync(
				path.join(
					__dirname,
					'..',
					'..',
					'printed',
					file + (file.endsWith('.json') ? '' : '.json'),
				),
				JSON.stringify(json, null, 2),
			);
		}

		/* NOT FOR BROWSER END */

		return json;
	}

	/* NOT FOR BROWSER */

	/**
	 * Check if the current element matches the selector
	 *
	 * 检查是否符合选择器
	 * @param selector 选择器
	 */
	matches<T>(selector?: string): this is T {
		return selector === undefined || getCondition<T>(selector, this)(this);
	}

	/**
	 * Get all descendants of the types
	 *
	 * 类型选择器
	 * @param types token types / 节点类型
	 */
	getElementByTypes<T = Token>(types: string): T | undefined {
		const typeSet = new Set(types.split(',').map(str => str.trim()));
		return this.#getElementBy((({type}) => typeSet.has(type)) as TokenPredicate<T>);
	}

	/**
	 * Get the first descendant with the id
	 *
	 * id选择器
	 * @param id id名
	 */
	getElementById<T = Token>(id: string): T | undefined {
		return this.#getElementBy((token => 'id' in token && token.id === id) as TokenPredicate<T>);
	}

	/**
	 * Get all descendants with the class
	 *
	 * 类选择器
	 * @param className class name / 类名之一
	 */
	getElementsByClassName<T = Token>(className: string): T[] {
		return this.#getElementsBy(
			(token => 'classList' in token && (token.classList as Set<string>).has(className)) as TokenPredicate<T>,
		);
	}

	/**
	 * Get all descendants with the tag name
	 *
	 * 标签名选择器
	 * @param tag tag name / 标签名
	 */
	getElementsByTagName<T = Token>(tag: string): T[] {
		return this.#getElementsBy<T>(
			(({type, name}) => name === tag && (type === 'html' || type === 'ext')) as TokenPredicate<T>,
		);
	}

	/**
	 * Insert a batch of child nodes at the start
	 *
	 * 在开头批量插入子节点
	 * @param elements nodes to be inserted / 插入节点
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
		/* istanbul ignore if */
		if (i === -1) {
			throw new RangeError('Not a child node!');
		}
		return i;
	}

	/**
	 * Remove a child node
	 *
	 * 移除子节点
	 * @param node child node to be removed / 子节点
	 */
	removeChild<T extends AstNodes>(node: T): T {
		return this.removeAt(this.#getChildIndex(node)) as T;
	}

	/**
	 * Insert a child node before the reference node
	 *
	 * 在指定位置前插入子节点
	 * @param child node to be inserted / 插入节点
	 * @param reference reference child node / 指定位置处的子节点
	 */
	insertBefore(child: string, reference?: AstNodes): AstText;
	insertBefore<T extends AstNodes>(child: T, reference?: AstNodes): T;
	insertBefore<T extends AstNodes>(child: T | string, reference?: AstNodes): T | AstText {
		return reference === undefined
			? this.insertAt(child as T)
			: this.insertAt(child as T, this.#getChildIndex(reference));
	}

	/**
	 * Get the caret position from the point
	 *
	 * 找到给定位置
	 * @param x column number / 列数
	 * @param y line number / 行数
	 */
	caretPositionFromPoint(x: number, y: number): CaretPosition | undefined {
		return this.caretPositionFromIndex(this.indexFromPos(y, x));
	}

	/**
	 * Get all ancestor elements from the character index
	 *
	 * 找到给定位置所在的所有节点
	 * @param index character index / 位置
	 */
	elementsFromIndex(index?: number): Token[] {
		const offsetNode = this.elementFromIndex(index);
		return offsetNode ? [...offsetNode.getAncestors().reverse(), offsetNode] : [];
	}

	/**
	 * Get all ancestor elements from the position
	 *
	 * 找到给定位置所在的所有节点
	 * @param x column number / 列数
	 * @param y line number / 行数
	 */
	elementsFromPoint(x: number, y: number): Token[] {
		return this.elementsFromIndex(this.indexFromPos(y, x));
	}
}

classes['AstElement'] = __filename;
