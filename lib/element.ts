import * as fs from 'fs';
import * as path from 'path';
import {toCase, noWrap, print, text} from '../util/string';
import {parseSelector} from '../parser/selector';
import {Ranges} from './ranges';
import {Title} from './title';
import * as Parser from '../index';
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

/** 类似HTMLElement */
export abstract class AstElement extends AstNode {
	name?: string;

	/** 子节点总数 */
	get length(): number {
		return this.childNodes.length;
	}

	/**
	 * 可见部分
	 * @param separator 子节点间的连接符
	 */
	text(separator?: string): string {
		return text(this.childNodes, separator);
	}

	/** 合并相邻的文本子节点 */
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
	 * @param selector 选择器
	 */
	closest(selector: string): Token | undefined {
		let {parentNode} = this,
			condition: (token: Token) => boolean;
		if (/[^a-z\-,\s]/u.test(selector)) {
			const stack = parseSelector(selector);
			condition = /** @implements */ (token: Token): boolean => token.#matchesStack(stack);
		} else {
			const types = new Set(selector.split(',').map(str => str.trim()));
			condition = /** @implements */ ({type}): boolean => types.has(type);
		}
		while (parentNode) {
			if (condition(parentNode)) {
				return parentNode;
			}
			({parentNode} = parentNode);
		}
		return undefined;
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
	 * @param omit 忽略的节点类型
	 * @param separator 子节点间的连接符
	 */
	override toString(omit?: Set<string>, separator = ''): string {
		return omit && this.matchesTypes(omit)
			? ''
			: this.childNodes.map(child => child.toString(omit)).join(separator);
	}

	/**
	 * Linter
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
	 * @param opt 选项
	 */
	print(opt: PrintOpt = {}): string {
		return String(this) ? `<span class="wpb-${opt.class ?? this.type}">${print(this.childNodes, opt)}</span>` : '';
	}
}
