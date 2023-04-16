import {ParserConfig, LintError} from '..';
import Token = require('../src');
import AstText = require('./text');

declare type TokenAttribute<T extends string> =
	T extends 'stage' ? number :
	T extends 'config' ? ParserConfig :
	T extends 'accum' ? Token[] :
	T extends 'parentNode' ? Token :
	T extends 'parseOnce' ? (n?: number, include?: boolean) => Token :
	T extends 'buildFromStr' ? <S extends string>(str: string, type: S) => S extends 'string'|'text' ? string : (AstText|Token)[] :
	T extends 'build' ? () => void :
	T extends 'bracket'|'include' ? boolean :
	string;

/** 类似Node */
declare class AstNode {
	type: string;
	childNodes: (AstText|Token)[];

	/** 首位子节点 */
	get firstChild(): AstText|Token;

	/** 末位子节点 */
	get lastChild(): AstText|Token;

	/** 父节点 */
	get parentNode(): Token;

	/** 后一个兄弟节点 */
	get nextSibling(): AstText|Token;

	/** 前一个兄弟节点 */
	get previousSibling(): AstText|Token;

	/**
	 * 是否具有某属性
	 * @param key 属性键
	 */
	hasAttribute(key: string): boolean;

	/**
	 * 获取属性值。除非用于私有属性，否则总是返回字符串。
	 * @param key 属性键
	 */
	getAttribute<T extends string>(key: T): TokenAttribute<T>;

	/**
	 * 设置属性
	 * @param key 属性键
	 * @param value 属性值
	 */
	setAttribute<T extends string>(key: T, value?: TokenAttribute<T>): this;

	/**
	 * 可见部分
	 * @param separator 子节点间的连接符
	 */
	text(separator?: string): string;

	/**
	 * 移除子节点
	 * @param i 移除位置
	 */
	removeAt(i: number): AstText|Token;

	/**
	 * 插入子节点
	 * @param node 待插入的子节点
	 * @param i 插入位置
	 * @throws `RangeError` 不能插入祖先节点
	 */
	insertAt<T extends AstText|Token>(node: T, i?: number): T;

	/** 合并相邻的文本子节点 */
	normalize(): void;

	/** 获取根节点 */
	getRootNode(): Token;

	/**
	 * 将字符位置转换为行列号
	 * @param index 字符位置
	 */
	posFromIndex(index: number): {
		top: number;
		left: number;
	};

	/** 第一个子节点前的间距 */
	getPadding(): number;

	/** 子节点间距 */
	getGaps(i?: number): number;

	/**
	 * 获取当前节点的相对字符位置，或其第`j`个子节点的相对字符位置
	 * @param j 子节点序号
	 */
	getRelativeIndex(j?: number): number;

	/** 获取当前节点的绝对位置 */
	getAbsoluteIndex(): number;

	/** 行数 */
	get offsetHeight(): number;

	/** 最后一行的列数 */
	get offsetWidth(): number;

	/**
	 * Linter
	 * @param start 起始位置
	 */
	lint(start?: number): LintError[];

	/** 复制 */
	cloneNode(): this;
}

declare namespace AstNode {
	export {TokenAttribute};
}

export = AstNode;
