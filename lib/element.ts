import {
	print,
	text,
} from '../util/string';
import {AstNode} from './node';
import type {LintError} from '../base';
import type {
	AstNodes,
	Token,
} from '../internal';

/** 类似HTMLElement */
export abstract class AstElement extends AstNode {
	declare readonly name?: string;
	declare readonly data: undefined;

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
		const childNodes = [...this.childNodes],
			[node] = childNodes.splice(i, 1) as [AstNodes];
		return node;
	}

	/**
	 * 插入子节点
	 * @param node 待插入的子节点
	 * @param i 插入位置
	 */
	insertAt<T extends AstNodes>(node: T, i = this.length): T {
		const childNodes = [...this.childNodes];
		node.setAttribute('parentNode', this as AstElement as Token);
		childNodes.splice(i, 0, node);
		return node;
	}

	/**
	 * 最近的祖先节点
	 * @param selector 选择器
	 */
	closest<T extends Token>(selector: string): T | undefined {
		let {parentNode} = this,
			condition: (token: Token) => token is T;
		const types = new Set(selector.split(',').map(str => str.trim()));
		condition = /** @implements */ (token): token is T => types.has(token.type);
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
	 */
	setText(str: string, i = 0): string {
		const oldText = this.childNodes.at(i)!,
			{type, constructor: {name}} = oldText;
		const {data} = oldText;
		oldText.replaceData(str);
		return data;
	}

	/** @private */
	override toString(omit?: Set<string>, separator = ''): string {
		return omit && this.matchesTypes(omit)
			? ''
			: this.childNodes.map(child => child.toString(omit)).join(separator);
	}

	/**
	 * @override
	 * @param start
	 */
	lint(start = this.getAbsoluteIndex()): LintError[] {
		const errors: LintError[] = [];
		for (let i = 0, cur = start + this.getAttribute('padding'); i < this.length; i++) {
			const child = this.childNodes[i]!;
			errors.push(...child.lint(cur));
			cur += String(child).length + this.getGaps(i);
		}
		return errors;
	}

	/**
	 * @override
	 * @param opt 选项
	 */
	print(opt: PrintOpt = {}): string {
		return String(this) ? `<span class="wpb-${opt.class ?? this.type}">${print(this.childNodes, opt)}</span>` : '';
	}
}
