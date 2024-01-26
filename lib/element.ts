import {
	print,
	text,
} from '../util/string';
import {setChildNodes} from '../util/debug';
import {AstNode} from './node';
import type {LintError} from '../base';
import type {
	AstNodes,
	AstText,
	Token,
} from '../internal';

// @ts-expect-error unconstrained predicate
declare type TokenPredicate<T = Token> = (token: Token) => token is T;

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
		this.setAttribute('childNodes', childNodes);
	}

	/**
	 * 移除子节点
	 * @param i 移除位置
	 */
	removeAt(i: number): AstNodes {
		return setChildNodes(this as AstElement as Token, i, 1)[0]!;
	}

	/**
	 * 插入子节点
	 * @param node 待插入的子节点
	 * @param i 插入位置
	 */
	insertAt<T extends AstNodes>(node: T, i = this.length): T {
		setChildNodes(this as AstElement as Token, i, 0, [node]);
		return node;
	}

	/**
	 * 将选择器转化为类型谓词
	 * @param selector 选择器
	 */
	#getCondition<T>(selector: string): TokenPredicate<T> {
		let condition: TokenPredicate<T>;
		const types = new Set(selector.split(',').map(str => str.trim()));
		// eslint-disable-next-line prefer-const
		condition = (token => types.has(token.type)) as TokenPredicate<T>;
		return condition;
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
		i += i < 0 ? this.length : 0;
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

	/**
	 * 保存为JSON
	 * @param file 文件名
	 */
	json(file?: string): object {
		const json: object = {
			...this,
			childNodes: this.childNodes.map(child => child.type === 'text' ? {data: child.data} : child.json()),
		};
		return json;
	}
}
