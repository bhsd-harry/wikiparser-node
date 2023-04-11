import AstNode = require('./node');
import Token = require('../src');
import AstText = require('./text');

declare interface SelectorArray extends Array<string|string[]> {
	relation: string;
}

declare interface printOpt {
	pre?: string;
	post?: string;
	sep?: string;
	class?: string;
}

/** 类似HTMLElement */
declare class AstElement extends AstNode {
	name: string;

	/** 子节点总数 */
	get length(): number;

	/** 全部非文本子节点 */
	get children(): Token[];

	/** 首位非文本子节点 */
	get firstElementChild(): Token;

	/** 末位非文本子节点 */
	get lastElementChild(): Token;

	/** 非文本子节点总数 */
	get childElementCount(): number;

	/** 父节点 */
	get parentElement(): Token;

	/** AstElement.prototype.text()的getter写法 */
	get outerText(): string;

	/** 不可见 */
	get hidden(): boolean;

	/** 后一个可见的兄弟节点 */
	get nextVisibleSibling(): AstText|Token;

	/** 前一个可见的兄弟节点 */
	get previousVisibleSibling(): AstText|Token;

	/** 内部高度 */
	get clientHeight(): number;

	/** 内部宽度 */
	get clientWidth(): number;

	/** 销毁 */
	destroy(): void;

	/** 检查是否符合选择器 */
	matches(selector: string|SelectorArray[]): boolean;

	/** 符合选择器的第一个后代节点 */
	querySelector(selector: string): Token;

	/** 符合选择器的所有后代节点 */
	querySelectorAll(selector: string): Token[];

	/**
	 * id选择器
	 * @param id id名
	 */
	getElementById(id: string): Token;

	/**
	 * 类选择器
	 * @param className 类名之一
	 */
	getElementsByClassName(className: string): Token[];

	/**
	 * 标签名选择器
	 * @param name 标签名
	 */
	getElementsByTagName(name: string): Token[];

	/**
	 * 获取某一行的wikitext
	 * @param n 行号
	 */
	getLine(n: number): string;

	/**
	 * 在开头批量插入子节点
	 * @param elements 插入节点
	 */
	prepend(...elements: (string|AstText|Token)[]): void;

	/** 最近的祖先节点 */
	closest(selector: string): Token;

	/**
	 * 在末尾批量插入子节点
	 * @param elements 插入节点
	 */
	append(...elements: (string|AstText|Token)[]): void;

	/**
	 * 批量替换子节点
	 * @param elements 新的子节点
	 */
	replaceChildren(...elements: (string|AstText|Token)[]): void;

	/**
	 * 修改文本子节点
	 * @param str 新文本
	 * @param i 子节点位置
	 * @throws `RangeError` 对应位置的子节点不是文本节点
	 */
	setText(str: string, i?: number): string;

	/**
	 * 还原为wikitext
	 * @param separator 子节点间的连接符
	 */
	toString(selector?: string, separator?: string): string;

	/**
	 * 以HTML格式打印
	 * @param opt 选项
	 */
	print(opt?: printOpt): string;

	/**
	 * 保存为JSON
	 * @param file 文件名
	 */
	json(file?: string): Record<string, unknown>;

	/**
	 * 输出AST
	 * @param depth 当前深度
	 */
	echo(depth?: number): void;
}

declare namespace AstElement {
	export {SelectorArray, printOpt};
}

export = AstElement;
