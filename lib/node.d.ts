import {ParserConfig, LintError} from '..';
import Ranges = require('./ranges');
import Token = require('../src');
import AstText = require('./text');
import ParameterToken = require('../src/parameter');

declare type TokenAttribute<T extends string> =
    T extends 'stage' ? number :
    T extends 'config' ? ParserConfig :
    T extends 'accum' ? Token[] :
    T extends 'parentNode' ? Token :
    T extends 'childNodes' ? (AstText|Token)[] :
    T extends 'parseOnce' ? (n?: number, include?: boolean) => Token :
    T extends 'buildFromStr' ? <S extends string>(str: string, type: S) => S extends 'string'|'text' ? string : (AstText|Token)[] :
    T extends 'build' ? () => void :
    T extends 'bracket'|'include' ? boolean :
    T extends 'pattern' ? RegExp :
    T extends 'tags'|'flags'|'quotes' ? string[] :
    T extends 'optional'|'keys' ? Set<string> :
    T extends 'acceptable' ? Record<string, Ranges> :
    T extends 'args' ? Record<string, Set<ParameterToken>> :
    T extends 'protectedChildren' ? Ranges :
    T extends 'verifyChild' ? (i: number, addition?: number) => void :
    T extends 'matchesAttr' ? (key: string, equal: string, val: string, i: string) => boolean :
    T extends 'protectChildren' ? (...args: (string|number|Range)[]) => void :
    string;

declare interface AstEvent {
	readonly type: string;
	readonly target: Token & AstText;
	currentTarget: Token;
	prevTarget?: Token;
	bubbles: boolean;
}

declare interface AstEventData {
	position: number;
	removed: AstText|Token;
	inserted: AstText|Token;
	oldToken: Token;
	newToken: Token;
	oldText: string;
	newText: string;
	oldKey: string;
	newKey: string;
}

declare type AstListener = (e: AstEvent, data: AstEventData) => void;

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

	/** 后一个非文本兄弟节点 */
	get nextElementSibling(): Token;

	/** 前一个非文本兄弟节点 */
	get previousElementSibling(): Token;

	/** 是否具有根节点 */
	get isConnected(): boolean;

	/** 不是自身的根节点 */
	get ownerDocument(): Token;

	/** 后方是否还有其他节点（不含后代） */
	get eof(): boolean;

	/**
	 * 标记仅用于代码调试的方法
	 * @param method
	 * @throws `Error`
	 */
	debugOnly(method?: string): never;

	/**
	 * 抛出`TypeError`
	 * @param method
	 * @param types 可接受的参数类型
	 */
	typeError(method: string, ...types: string[]): never;

	/**
	 * 冻结部分属性
	 * @param keys 属性键
	 * @param permanent 是否永久
	 */
	seal(keys: string | string[], permanent?: boolean): void;

	/**
	 * 是否是全同节点
	 * @param node 待比较的节点
	 * @throws `assert.AssertionError`
	 */
	isEqualNode(node: AstNode): boolean;

	/**
	 * 是否具有某属性
	 * @param key 属性键
	 */
	hasAttribute(key: PropertyKey): boolean;

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
	setAttribute<T extends string>(key: T, value: TokenAttribute<T>): this;

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

	/**
	 * 移除子节点
	 * @param node 子节点
	 */
	removeChild<T extends AstText|Token>(node: T): T;

	/**
	 * 在末尾插入子节点
	 * @param node 插入节点
	 */
	appendChild<T extends AstText|Token>(node: T): T;

	/**
	 * 在指定位置前插入子节点
	 * @param child 插入节点
	 * @param reference 指定位置处的子节点
	 */
	insertBefore<T extends AstText|Token>(child: T, reference: AstNode): T;

	/**
	 * 替换子节点
	 * @param newChild 新子节点
	 * @param oldChild 原子节点
	 */
	replaceChild<T extends AstText|Token>(newChild: AstText|Token, oldChild: T): T;

	/**
	 * 在后方批量插入兄弟节点
	 * @param nodes 插入节点
	 */
	after(...nodes: (AstText|Token)[]): void;

	/**
	 * 在前方批量插入兄弟节点
	 * @param nodes 插入节点
	 */
	before(...nodes: (AstText|Token)[]): void;

	/**
	 * 移除当前节点
	 * @throws `Error` 不存在父节点
	 */
	remove(): void;

	/**
	 * 将当前节点批量替换为新的节点
	 * @param nodes 插入节点
	 */
	replaceWith(...nodes: (AstText|Token)[]): void;

	/**
	 * 是自身或后代节点
	 * @param node 待检测节点
	 */
	contains(node: AstText|Token): boolean;

	/**
	 * 添加事件监听
	 * @param types 事件类型
	 * @param listener 监听函数
	 * @param options 选项
	 */
	addEventListener(types: string | string[], listener: AstListener, options: {
        once: boolean;
    }): void;

	/**
	 * 移除事件监听
	 * @param types 事件类型
	 * @param listener 监听函数
	 */
	removeEventListener(types: string | string[], listener: AstListener): void;

	/**
	 * 移除事件的所有监听
	 * @param types 事件类型
	 */
	removeAllEventListeners(types: string | string[]): void;

	/**
	 * 列举事件监听
	 * @param type 事件类型
	 */
	listEventListeners(type: string): AstListener[];

	/**
	 * 触发事件
	 * @param e 事件对象
	 * @param data 事件数据
	 */
	dispatchEvent(e: AstEvent, data: unknown): void;

	/** 获取所有祖先节点 */
	getAncestors(): Token[];

	/**
	 * 比较和另一个节点的相对位置
	 * @param other 待比较的节点
	 * @throws `Error` 不在同一个语法树
	 */
	compareDocumentPosition(other: AstText|Token): number;

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

	/**
	 * 将行列号转换为字符位置
	 * @param top 行号
	 * @param left 列号
	 */
	indexFromPos(top: number, left: number): number;

	/** 第一个子节点前的间距 */
	getPadding(): number;

	/** 子节点间距 */
	getGaps(j?: number): number;

	/**
	 * 获取当前节点的相对字符位置，或其第`j`个子节点的相对字符位置
	 * @param j 子节点序号
	 */
	getRelativeIndex(j?: number): number;

	/** 获取当前节点的绝对位置 */
	getAbsoluteIndex(): number;

	/** 获取当前节点的行列位置和大小 */
	getBoundingClientRect(): {
        top: number;
        left: number;
        height: number;
        width: number;
    };

	/** 行数 */
	get offsetHeight(): number;

	/** 最后一行的列数 */
	get offsetWidth(): number;

	/** 相对于父容器的行号 */
	get offsetTop(): number;

	/** 相对于父容器的列号 */
	get offsetLeft(): number;

	/** 位置、大小和padding */
	get style(): {
        padding: number;
        height: number;
        width: number;
        top: number;
        left: number;
    };

	/**
	 * Linter
	 * @param start 起始位置
	 */
	lint(start?: number): LintError[];

	/** 复制 */
	cloneNode(): this;
}

declare namespace AstNode {
    export {TokenAttribute, AstEvent, AstListener};
}

export = AstNode;
