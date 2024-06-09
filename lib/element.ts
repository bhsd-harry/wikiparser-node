import * as fs from 'fs';
import * as path from 'path';
import {
	text,
	print,
} from '../util/string';
import {setChildNodes} from '../util/debug';
import {classes} from '../util/constants';
import {Ranges} from './ranges';
import {Title} from './title';
import {AstNode} from './node';
import type {
	LintError,
	AST,
} from '../base';
import type {AttributesParentBase} from '../mixin/attributesParent';
import type {AstNodes, AstText, Token} from '../internal';

// @ts-expect-error unconstrained predicate
declare type TokenPredicate<T = Token> = (token: Token) => token is T;

/* NOT FOR BROWSER */

/**
 * optionally convert to lower cases
 * @param val 属性值
 * @param i 是否对大小写不敏感
 */
const toCase = (val: string, i: unknown): string => i ? val.toLowerCase() : val;

/**
 * 检查某个下标是否符合表达式
 * @param str 表达式
 * @param i 待检查的下标
 */
const nth = (str: string, i: number): boolean => new Ranges(str).applyTo(i + 1).includes(i);

/**
 * 检测:lang()伪选择器
 * @param node 节点
 * @param node.attributes 节点属性
 * @param regex 语言正则
 */
const matchesLang = (
	{attributes}: AstElement & {attributes?: Record<string, string | true>},
	regex: RegExp,
): boolean => {
	const lang = attributes?.['lang'];
	return typeof lang === 'string' && regex.test(lang);
};

const primitives = new Set(['string', 'number', 'boolean', 'undefined']);

/* NOT FOR BROWSER END */

/** 类似HTMLElement */
export abstract class AstElement extends AstNode {
	declare readonly name?: string;
	declare readonly data: undefined;

	/** 子节点总数 */
	get length(): number {
		return this.childNodes.length;
	}

	/* NOT FOR BROWSER */

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
			return lines[lines.length - 1]!.length;
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
	 * 将选择器转化为类型谓词
	 * @param selector 选择器
	 */
	#getCondition<T>(selector: string): TokenPredicate<T> {
		/* NOT FOR BROWSER */

		if (/[^a-z\-,\s]/u.test(selector)) {
			const {parseSelector}: typeof import('../parser/selector') = require('../parser/selector');
			const stack = parseSelector(selector);
			return (token => stack.some(copy => token.#matchesArray(copy))) as TokenPredicate<T>;
		}

		/* NOT FOR BROWSER END */

		const types = new Set(selector.split(',').map(str => str.trim()));
		return (({type}) => types.has(type)) as TokenPredicate<T>;
	}

	/**
	 * 最近的祖先节点
	 * @param selector 选择器
	 */
	closest<T = Token>(selector: string): T | undefined {
		const condition = this.#getCondition<T>(selector);
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
		const condition = this.#getCondition<T>(selector);
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
		const condition = this.#getCondition<T>(selector);
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
	override toString(separator = ''): string {
		return this.childNodes.map(String).join(separator);
	}

	/** @private */
	lint(start = this.getAbsoluteIndex(), re?: RegExp): LintError[] {
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
		return this.toString()
			? `<span class="wpb-${opt.class ?? this.type}">${print(this.childNodes, opt)}</span>`
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

	/** 是否受保护。保护条件来自Token，这里仅提前用于:required和:optional伪选择器。 */
	#isProtected(): boolean | undefined {
		const {parentNode} = this;
		if (!parentNode) {
			return undefined;
		}
		const {childNodes, fixed} = parentNode;
		return fixed
			|| parentNode.getAttribute('protectedChildren').applyTo(childNodes)
				.includes(childNodes.indexOf(this as AstElement as Token));
	}

	/**
	 * 检查是否符合属性选择器
	 * @param key 属性键
	 * @param equal 比较符
	 * @param val 属性值
	 * @param i 是否对大小写不敏感
	 * @throws `RangeError` 复杂属性不能用于选择器
	 */
	#matchesAttr(
		this: AstElement & Partial<AttributesParentBase>,
		key: string,
		equal?: string,
		val = '',
		i?: string,
	): boolean {
		const isAttr = typeof this.hasAttr === 'function' && typeof this.getAttr === 'function';
		if (!(key in this) && (!isAttr || !this.hasAttr!(key))) {
			return equal === '!=';
		}
		const v = toCase(val, i);
		let thisVal = this.getAttribute(key);
		if (isAttr) {
			const attr = this.getAttr!(key);
			if (attr !== undefined) {
				thisVal = attr === true ? '' : attr;
			}
		}
		if (!equal) {
			return thisVal !== undefined && thisVal !== false;
		} else if (thisVal instanceof RegExp) {
			thisVal = thisVal.source;
		}
		if (equal === '~=') {
			const thisVals = typeof thisVal === 'string' ? thisVal.split(/\s/u) : thisVal;
			return Boolean(thisVals?.[Symbol.iterator as keyof unknown])
				&& [...thisVals as Iterable<unknown>].some(w => typeof w === 'string' && toCase(w, i) === v);
		} else if (!primitives.has(typeof thisVal) && !(thisVal instanceof Title)) {
			throw new RangeError(`The complex attribute ${key} cannot be used in a selector!`);
		}
		const stringVal = toCase(String(thisVal), i);
		switch (equal) {
			case '|=':
				return stringVal === v || stringVal.startsWith(`${v}-`);
			case '^=':
				return stringVal.startsWith(v);
			case '$=':
				return stringVal.endsWith(v);
			case '*=':
				return stringVal.includes(v);
			case '!=':
				return stringVal !== v;
			default: // `=`
				return stringVal === v;
		}
	}

	/**
	 * 检查是否符合解析后的选择器，不含节点关系
	 * @param step 解析后的选择器
	 * @throws `SyntaxError` 错误的正则伪选择器
	 * @throws `SyntaxError` 未定义的伪选择器
	 */
	#matches(step: SelectorArray): boolean {
		const {parentNode, type, name, childNodes, link} = this as AstElement & {link?: string | Title},
			children = parentNode?.children,
			childrenOfType = children?.filter(({type: t}) => t === type),
			siblingsCount = children?.length ?? 1,
			siblingsCountOfType = childrenOfType?.length ?? 1,
			index = (children?.indexOf(this as AstElement as Token) ?? 0) + 1,
			indexOfType = (childrenOfType?.indexOf(this as AstElement as Token) ?? 0) + 1,
			lastIndex = siblingsCount - index + 1,
			lastIndexOfType = siblingsCountOfType - indexOfType + 1;
		return step.every(selector => {
			if (typeof selector === 'string') {
				switch (selector) { // 情形1：简单伪选择器、type和name
					case '*':
						return true;
					case ':root':
						return !parentNode;
					case ':first-child':
						return index === 1;
					case ':first-of-type':
						return indexOfType === 1;
					case ':last-child':
						return lastIndex === 1;
					case ':last-of-type':
						return lastIndexOfType === 1;
					case ':only-child':
						return siblingsCount === 1;
					case ':only-of-type':
						return siblingsCountOfType === 1;
					case ':empty':
						return !childNodes.some(({type: t, data}) => t !== 'text' || data);
					case ':parent':
						return childNodes.some(({type: t, data}) => t !== 'text' || data);
					case ':header':
						return type === 'heading';
					case ':hidden':
						return this.text() === '';
					case ':visible':
						return this.text() !== '';
					case ':only-whitespace':
						return this.text().trim() === '';
					case ':any-link':
						return type === 'link'
							|| type === 'free-ext-link'
							|| type === 'magic-link'
							|| type === 'ext-link'
							|| (type === 'file' || type === 'gallery-image' && link);
					case ':local-link':
						return (type === 'link' || type === 'file' || type === 'gallery-image')
							&& link instanceof Title
							&& link.title === '';
					case ':invalid':
						return type === 'table-inter' || type === 'image-parameter' && name === 'invalid';
					case ':required':
						return this.#isProtected() === true;
					case ':optional':
						return this.#isProtected() === false;
					default: {
						const [t, n] = selector.split('#');
						return (!t || t === type) && (!n || n === name);
					}
				}
			} else if (selector.length === 4) { // 情形2：属性选择器
				return this.#matchesAttr(...selector);
			}
			const [s, pseudo] = selector; // 情形3：复杂伪选择器
			switch (pseudo) {
				case 'is':
					return this.matches(s);
				case 'not':
					return !this.matches(s);
				case 'nth-child':
					return nth(s, index);
				case 'nth-of-type':
					return nth(s, indexOfType);
				case 'nth-last-child':
					return nth(s, lastIndex);
				case 'nth-last-of-type':
					return nth(s, lastIndexOfType);
				case 'contains':
					return this.text().includes(s);
				case 'has':
					return Boolean(this.querySelector<Token>(s));
				case 'lang': {
					// eslint-disable-next-line @typescript-eslint/no-unused-expressions
					/^zh(?:-|$)/u;
					const regex = new RegExp(`^${s}(?:-|$)`, 'u');
					return matchesLang(this, regex)
						|| this.getAncestors().some(ancestor => matchesLang(ancestor, regex));
				}
				case 'regex': {
					const mt = /^([^,]+),\s*\/(.+)\/([a-z]*)$/u.exec(s) as [string, string, string, string] | null;
					if (!mt) {
						throw new SyntaxError(
							`Wrong usage of the regex pseudo-selector. Use ":regex('attr, /re/i')" format.`,
						);
					}
					try {
						return new RegExp(mt[2], mt[3]).test(String(this.getAttribute(mt[1].trim())));
					} catch {
						throw new SyntaxError(`Invalid regular expression: /${mt[2]}/${mt[3]}`);
					}
				}
				default:
					throw new SyntaxError(`Undefined pseudo-selector: ${pseudo}`);
			}
		});
	}

	/**
	 * 检查是否符合解析后的选择器
	 * @param copy 解析后的选择器
	 */
	#matchesArray(copy: readonly SelectorArray[]): boolean {
		const condition = [...copy],
			step = condition.pop()!;
		if (this.#matches(step)) {
			const {parentNode, previousElementSibling} = this;
			switch (condition[condition.length - 1]?.relation) {
				case undefined:
					return true;
				case '>':
					return Boolean(parentNode && parentNode.#matchesArray(condition));
				case '+':
					return Boolean(previousElementSibling && previousElementSibling.#matchesArray(condition));
				case '~': {
					if (!parentNode) {
						return false;
					}
					const {children} = parentNode;
					return children.slice(0, children.indexOf(this as AstElement as Token))
						.some(child => child.#matchesArray(condition));
				}
				default: // ' '
					return this.getAncestors().some(ancestor => ancestor.#matchesArray(condition));
			}
		}
		return false;
	}

	/**
	 * 检查是否符合选择器
	 * @param selector 选择器
	 */
	matches<T>(selector?: string): this is T {
		return selector === undefined || this.#getCondition<T>(selector)(this as unknown as Token);
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
