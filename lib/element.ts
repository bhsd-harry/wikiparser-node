import {print, text} from '../util/string';
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
	declare name?: string;
	declare data: undefined;

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
		const {childNodes} = this;
		for (let i = childNodes.length - 1; i >= 0; i--) {
			const {type, data} = childNodes[i]!,
				prev = childNodes[i - 1];
			if (type !== 'text' || this.getGaps(i - 1)) {
				//
			} else if (data === '') {
				childNodes.splice(i, 1);
			} else if (prev?.type === 'text') {
				prev.setAttribute('data', prev.data + data);
				childNodes.splice(i, 1);
			}
		}
	}

	/**
	 * 移除子节点
	 * @param i 移除位置
	 */
	removeAt(i: number): AstNodes {
		const {childNodes} = this,
			[node] = childNodes.splice(i, 1) as [AstNodes];
		return node;
	}

	/**
	 * 插入子节点
	 * @param node 待插入的子节点
	 * @param i 插入位置
	 * @throws `RangeError` 不能插入祖先节点
	 */
	insertAt<T extends AstNodes>(node: T, i = this.length): T {
		const {childNodes} = this;
		node.setAttribute('parentNode', this as AstElement as Token);
		childNodes.splice(i, 0, node);
		return node;
	}

	/**
	 * 最近的祖先节点
	 * @param selector 选择器
	 */
	closest(selector: string): Token | undefined {
		let {parentNode} = this,
			condition: (token: Token) => boolean;
		const types = new Set(selector.split(',').map(str => str.trim()));
		// eslint-disable-next-line prefer-const
		condition = /** @implements */ ({type}): boolean => types.has(type);
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
		this.childNodes.length = 0;
		this.append(...elements);
	}

	/**
	 * 修改文本子节点
	 * @param str 新文本
	 * @param i 子节点位置
	 * @throws `RangeError` 对应位置的子节点不是文本节点
	 */
	setText(str: string, i = 0): string {
		const oldText = this.childNodes[i] as AstText;
		const {data} = oldText;
		oldText.replaceData(str);
		return data;
	}

	/** @private */
	override toString(omit?: Set<string>, separator = ''): string {
		return this.childNodes.map(child => child.toString()).join(separator);
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
		for (let i = 0, cur = start + this.getAttribute('padding'); i < this.length; i++) {
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
