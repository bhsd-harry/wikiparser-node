import * as fs from 'fs';
import * as path from 'path';
import {toCase, noWrap, print, text} from '../util/string';
import {parseSelector} from '../parser/selector';
import {Ranges} from './ranges';
import {Title} from './title';
import Parser from '../index';
import {AstNode} from './node';
import type {LintError} from '../index';
import type {AstNodes, AstText, Token} from '../internal';

const lintIgnoredExt = new Set([
	'nowiki',
	'pre',
	'charinsert',
	'score',
	'syntaxhighlight',
	'source',
	'math',
	'chem',
	'ce',
	'graph',
	'mapframe',
	'maplink',
	'quiz',
	'templatedata',
	'timeline',
]);

/**
 * 检查某个下标是否符合表达式
 * @param str 表达式
 * @param i 待检查的下标
 */
const nth = (str: string, i: number): boolean => new Ranges(str.split(',')).applyTo(i + 1).includes(i);

/** 类似HTMLElement */
export abstract class AstElement extends AstNode {
	/** @browser */
	name?: string;

	/**
	 * 子节点总数
	 * @browser
	 */
	get length(): number {
		return this.childNodes.length;
	}

	/** 全部非文本子节点 */
	get children(): Token[] {
		return this.childNodes.filter(({type}) => type !== 'text') as Token[];
	}

	/** 首位非文本子节点 */
	get firstElementChild(): Token | undefined {
		return this.childNodes.find(({type}) => type !== 'text') as Token | undefined;
	}

	/** 末位非文本子节点 */
	get lastElementChild(): Token | undefined {
		return this.children.at(-1);
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

	/** 内部高度 */
	get clientHeight(): number | undefined {
		const {innerText} = this as {innerText?: string};
		return typeof innerText === 'string' ? innerText.split('\n').length : undefined;
	}

	/** 内部宽度 */
	get clientWidth(): number | undefined {
		const {innerText} = this as {innerText?: string};
		return typeof innerText === 'string' ? innerText.split('\n').at(-1)!.length : undefined;
	}

	constructor() {
		super();
		this.seal('name');
	}

	/**
	 * 可见部分
	 * @browser
	 * @param separator 子节点间的连接符
	 */
	text(separator = ''): string {
		return text(this.childNodes, separator);
	}

	/**
	 * 合并相邻的文本子节点
	 * @browser
	 */
	normalize(): void {
		const childNodes = [...this.childNodes];
		for (let i = childNodes.length - 1; i >= 0; i--) {
			const cur = childNodes[i]!,
				prev = childNodes[i - 1];
			if (cur.type !== 'text' || this.getGaps(i - 1)) {
				//
			} else if (cur.data === '') {
				childNodes.splice(i, 1);
			} else if (prev?.type === 'text') {
				prev.setAttribute('data', prev.data + cur.data);
				childNodes.splice(i, 1);
			}
		}
		this.setAttribute('childNodes', childNodes);
	}

	/**
	 * 移除子节点
	 * @browser
	 * @param i 移除位置
	 */
	removeAt(i: number): AstNodes {
		this.verifyChild(i);
		const childNodes = [...this.childNodes],
			e = new Event('remove', {bubbles: true}),
			[node] = childNodes.splice(i, 1) as [AstNodes];
		node.setAttribute('parentNode', undefined);
		this.setAttribute('childNodes', childNodes);
		this.dispatchEvent(e, {position: i, removed: node});
		return node;
	}

	/**
	 * 插入子节点
	 * @browser
	 * @param node 待插入的子节点
	 * @param i 插入位置
	 * @throws `RangeError` 不能插入祖先节点
	 */
	insertAt<T extends AstNodes>(node: T, i = this.length): T {
		if (node.contains(this)) {
			Parser.error('不能插入祖先节点！', node);
			throw new RangeError('不能插入祖先节点！');
		}
		this.verifyChild(i, 1);
		const childNodes = [...this.childNodes],
			e = new Event('insert', {bubbles: true}),
			j = Parser.running ? -1 : childNodes.indexOf(node);
		if (j === -1) {
			node.parentNode?.removeChild(node);
			node.setAttribute('parentNode', this as AstElement as Token);
		} else {
			childNodes.splice(j, 1);
		}
		childNodes.splice(i, 0, node);
		this.setAttribute('childNodes', childNodes);
		this.dispatchEvent(e, {position: i < 0 ? i + this.length - 1 : i, inserted: node});
		return node;
	}

	/**
	 * 最近的祖先节点
	 * @browser
	 * @param selector 选择器
	 */
	closest(selector: string): Token | undefined {
		let {parentNode} = this;
		const stack = parseSelector(selector);
		while (parentNode) {
			if (parentNode.#matchesStack(stack)) {
				return parentNode;
			}
			({parentNode} = parentNode);
		}
		return undefined;
	}

	/**
	 * 在末尾批量插入子节点
	 * @browser
	 * @param elements 插入节点
	 */
	append(...elements: (AstNodes | string)[]): void {
		for (const element of elements) {
			this.insertAt(element as AstNodes);
		}
	}

	/**
	 * 批量替换子节点
	 * @browser
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
	 * @browser
	 * @param str 新文本
	 * @param i 子节点位置
	 * @throws `RangeError` 对应位置的子节点不是文本节点
	 */
	setText(str: string, i = 0): string {
		this.verifyChild(i);
		const oldText = this.childNodes.at(i)!,
			{type, constructor: {name}} = oldText;
		if (type === 'text') {
			const {data} = oldText;
			oldText.replaceData(str);
			return data;
		}
		throw new RangeError(`第 ${i} 个子节点是 ${name}！`);
	}

	/**
	 * 还原为wikitext
	 * @browser
	 * @param selector
	 * @param separator 子节点间的连接符
	 */
	override toString(selector?: string, separator = ''): string {
		return selector && this.matches(selector)
			? ''
			: this.childNodes.map(child => child.toString(selector)).join(separator);
	}

	/**
	 * Linter
	 * @browser
	 * @param start
	 */
	lint(start = this.getAbsoluteIndex()): LintError[] {
		const {SyntaxToken}: typeof import('../src/syntax') = require('../src/syntax');
		if (this instanceof SyntaxToken || (this.constructor as {hidden?: true}).hidden
			|| this.type === 'ext-inner' && lintIgnoredExt.has(this.name!)
		) {
			return [];
		}
		const errors: LintError[] = [];
		for (let i = 0, cur = start + this.getPadding(); i < this.length; i++) {
			const child = this.childNodes[i]!;
			errors.push(...child.lint(cur));
			cur += String(child).length + this.getGaps(i);
		}
		return errors;
	}

	/**
	 * 以HTML格式打印
	 * @browser
	 * @param opt 选项
	 */
	print(opt: PrintOpt = {}): string {
		return String(this)
			? `<span class="wpb-${opt.class ?? this.type}">${print(this.childNodes, opt)}</span>`
			: '';
	}

	/**
	 * 保存为JSON
	 * @browser
	 * @param file 文件名
	 */
	json(file?: string): unknown {
		const json: unknown = {
			...this,
			childNodes: this.childNodes.map(child => child.type === 'text' ? child.data : child.json()),
		};
		if (typeof file === 'string') {
			fs.writeFileSync(
				path.join(__dirname.slice(0, -4), '..', 'printed', `${file}${file.endsWith('.json') ? '' : '.json'}`),
				JSON.stringify(json, null, 2),
			);
		}
		return json;
	}

	/** 销毁 */
	destroy(): void {
		this.parentNode?.destroy();
		for (const child of this.childNodes) {
			child.setAttribute('parentNode', undefined);
		}
		Object.setPrototypeOf(this, null);
	}

	/** 是否受保护。保护条件来自Token，这里仅提前用于:required和:optional伪选择器。 */
	#isProtected(): boolean | undefined {
		const {parentNode} = this;
		if (!parentNode) {
			return undefined;
		}
		const {childNodes, fixed} = parentNode,
			protectedIndices = parentNode.getAttribute('protectedChildren').applyTo(childNodes);
		return fixed || protectedIndices.includes(childNodes.indexOf(this as AstElement as Token));
	}

	/** @private */
	protected matchesAttr(key: string, equal?: string, val = '', i?: string): boolean {
		if (!equal) {
			return this.hasAttribute(key);
		} else if (!this.hasAttribute(key)) {
			return equal === '!=';
		}
		const v = toCase(val, i);
		let thisVal = this.getAttribute(key) as unknown;
		if (thisVal instanceof RegExp) {
			thisVal = thisVal.source;
		}
		if (equal === '~=') {
			const thisVals = typeof thisVal === 'string' ? thisVal.split(/\s/u) : thisVal;
			// @ts-expect-error noImplicitAny
			return Boolean(thisVals?.[Symbol.iterator])
				// @ts-expect-error spread unknown
				&& [...thisVals].some(w => typeof w === 'string' && toCase(w, i) === v);
		} else if (typeof thisVal !== 'string') {
			throw new RangeError(`复杂属性 ${key} 不能用于选择器！`);
		}
		const stringVal = toCase(thisVal, i);
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
		const {
				parentNode, type, name, childNodes, link, fixed, constructor: {name: tokenName},
			} = this as AstElement & {link?: string | Title},
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
						return !childNodes.some(child => child.type !== 'text' || child.data);
					case ':parent':
						return childNodes.some(child => child.type !== 'text' || child.data);
					case ':header':
						return type === 'heading';
					case ':hidden':
						return this.text() === '';
					case ':visible':
						return this.text() !== '';
					case ':only-whitespace':
						return this.text().trim() === '';
					case ':any-link':
						return type === 'link' || type === 'free-ext-link' || type === 'ext-link'
							|| (type === 'file' || type === 'gallery-image' && link);
					case ':local-link':
						return (type === 'link' || type === 'file' || type === 'gallery-image')
							&& link instanceof Title && link.title === '';
					case ':read-only':
						return fixed;
					case ':read-write':
						return !fixed;
					case ':invalid':
						return type === 'table-inter' || tokenName === 'HiddenToken';
					case ':required':
						return this.#isProtected() === true;
					case ':optional':
						return this.#isProtected() === false;
					default: {
						const [t, n] = selector.split('#');
						return (!t || t === type || Boolean(Parser.typeAliases[type]?.includes(t)))
							&& (!n || n === name);
					}
				}
			} else if (selector.length === 4) { // 情形2：属性选择器
				return this.matchesAttr(...selector);
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
					return Boolean(this.querySelector(s));
				case 'lang': {
					const regex = new RegExp(`^${s}(?:-|$)`, 'u');
					return matchesLang(this, regex)
						|| this.getAncestors().some(ancestor => matchesLang(ancestor, regex));
				}
				case 'regex': {
					const mt = /^([^,]+),\s*\/(.+)\/([a-z]*)$/u.exec(s) as [string, string, string, string] | null;
					if (!mt) {
						throw new SyntaxError('错误的伪选择器用法。请使用形如 ":regex(\'attr, /re/i\')" 的格式。');
					}
					try {
						const regex = new RegExp(mt[2], mt[3]);
						return regex.test(String(this.getAttribute(mt[1].trim())));
					} catch {
						throw new SyntaxError(`错误的正则表达式：/${mt[2]}/${mt[3]}`);
					}
				}
				default:
					throw new SyntaxError(`未定义的伪选择器：${pseudo}`);
			}
		});
	}

	/**
	 * 检查是否符合解析后的选择器
	 * @param condition 解析后的选择器
	 */
	#matchesArray(condition: SelectorArray[]): boolean {
		const step = condition.pop()!;
		if (this.#matches(step)) {
			const {parentNode, previousElementSibling} = this;
			switch (condition.at(-1)?.relation) {
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
					const {children} = parentNode,
						i = children.indexOf(this as AstElement as Token);
					return children.slice(0, i).some(child => child.#matchesArray(condition));
				}
				default: // ' '
					return this.getAncestors().some(ancestor => ancestor.#matchesArray(condition));
			}
		}
		return false;
	}

	/**
	 * 检查是否符合解析后的组合选择器
	 * @param stack 解析后的一组选择器
	 */
	#matchesStack(stack: SelectorArray[][]): boolean {
		return stack.some(condition => this.#matchesArray([...condition]));
	}

	/**
	 * 检查是否符合选择器
	 * @param selector 选择器
	 */
	matches(selector?: string): boolean {
		return selector === undefined || this.#matchesStack(parseSelector(selector));
	}

	/**
	 * 符合组合选择器的第一个后代节点
	 * @param stack 解析后的一组选择器
	 */
	#queryStack(stack: SelectorArray[][]): Token | undefined {
		for (const child of this.children) {
			if (child.#matchesStack(stack)) {
				return child;
			}
			const descendant = child.#queryStack(stack);
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
	querySelector(selector: string): Token | undefined {
		return this.#queryStack(parseSelector(selector));
	}

	/**
	 * 符合组合选择器的所有后代节点
	 * @param stack 解析后的一组选择器
	 */
	#queryStackAll(stack: SelectorArray[][]): Token[] {
		const descendants: Token[] = [];
		for (const child of this.children) {
			if (child.#matchesStack(stack)) {
				descendants.push(child);
			}
			descendants.push(...child.#queryStackAll(stack));
		}
		return descendants;
	}

	/**
	 * 符合选择器的所有后代节点
	 * @param selector 选择器
	 */
	querySelectorAll(selector: string): Token[] {
		return this.#queryStackAll(parseSelector(selector));
	}

	/**
	 * id选择器
	 * @param id id名
	 */
	getElementById(id: string): Token | undefined {
		const eid = id.replace(/(?<!\\)"/gu, '\\"');
		return this.querySelector(`ext[id="${eid}"], html[id="${eid}"]`);
	}

	/**
	 * 类选择器
	 * @param className 类名之一
	 */
	getElementsByClassName(className: string): Token[] {
		return this.querySelectorAll(`[className~="${className.replace(/(?<!\\)"/gu, '\\"')}"]`);
	}

	/**
	 * 标签名选择器
	 * @param name 标签名
	 */
	getElementsByTagName(name: string): Token[] {
		const ename = name.replace(/(?<!\\)"/gu, '\\"');
		return this.querySelectorAll(`ext[name="${ename}"], html[name="${ename}"]`);
	}

	/**
	 * 获取某一行的wikitext
	 * @param n 行号
	 */
	getLine(n: number): string | undefined {
		return String(this).split('\n', n + 1)[n];
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
			Parser.error('找不到子节点！', node);
			throw new RangeError('找不到子节点！');
		}
		return i;
	}

	/**
	 * 移除子节点
	 * @param node 子节点
	 */
	removeChild<T extends AstNodes>(node: T): T {
		this.removeAt(this.#getChildIndex(node));
		return node;
	}

	/**
	 * 在末尾插入子节点
	 * @param node 插入节点
	 */
	appendChild(node: string): AstText;
	/** @ignore */
	appendChild<T extends AstNodes>(node: T): T;
	/** @ignore */
	appendChild<T extends AstNodes>(node: T | string): T | AstText {
		return this.insertAt(node as T);
	}

	/**
	 * 在指定位置前插入子节点
	 * @param child 插入节点
	 * @param reference 指定位置处的子节点
	 */
	insertBefore(child: string, reference?: AstNodes): AstText;
	/** @ignore */
	insertBefore<T extends AstNodes>(child: T, reference?: AstNodes): T;
	/** @ignore */
	insertBefore<T extends AstNodes>(child: T | string, reference?: AstNodes): T | AstText {
		return reference === undefined
			? this.insertAt(child as T)
			: this.insertAt(child as T, this.#getChildIndex(reference));
	}

	/**
	 * 替换子节点
	 * @param newChild 新子节点
	 * @param oldChild 原子节点
	 */
	replaceChild<T extends AstNodes>(newChild: AstNodes | string, oldChild: T): T {
		const i = this.#getChildIndex(oldChild);
		this.removeAt(i);
		this.insertAt(newChild as AstNodes, i);
		return oldChild;
	}

	/**
	 * 输出AST
	 * @param depth 当前深度
	 */
	echo(depth = 0): void {
		const indent = '  '.repeat(depth),
			str = String(this),
			{childNodes, type, length} = this;
		if (childNodes.every(child => child.type === 'text' || !String(child))) {
			console.log(`${indent}\x1B[32m<%s>\x1B[0m${noWrap(str)}\x1B[32m</%s>\x1B[0m`, type, type);
			return;
		}
		Parser.info(`${indent}<${type}>`);
		let i = this.getPadding();
		if (i) {
			console.log(`${indent}  ${noWrap(str.slice(0, i))}`);
		}
		for (let j = 0; j < length; j++) {
			const child = childNodes[j]!,
				childStr = String(child),
				gap = j === length - 1 ? 0 : this.getGaps(j);
			if (!childStr) {
				// pass
			} else if (child.type === 'text') {
				console.log(`${indent}  ${noWrap(child.data)}`);
			} else {
				child.echo(depth + 1);
			}
			i += childStr.length;
			if (gap) {
				console.log(`${indent}  ${noWrap(str.slice(i, i + gap))}`);
				i += gap;
			}
		}
		if (i < str.length) {
			console.log(`${indent}  ${noWrap(str.slice(i))}`);
		}
		Parser.info(`${indent}</${type}>`);
	}
}

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

Parser.classes['AstElement'] = __filename;
