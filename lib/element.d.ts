import AstNode = require('./node');
import Token = require('../src');
import AstText = require('./text');

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
}

declare namespace AstElement {
	export {printOpt};
}

export = AstElement;
