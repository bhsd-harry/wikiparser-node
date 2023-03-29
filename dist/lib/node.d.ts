export = AstNode;
/** 类似Node */
declare class AstNode {
    /** @type {string} */ type: string;
    /** @type {this[]} */ childNodes: AstNode[];
    /** 首位子节点 */
    get firstChild(): AstNode;
    /** 末位子节点 */
    get lastChild(): AstNode;
    /** 父节点 */
    get parentNode(): AstNode;
    /**
     * 后一个兄弟节点
     * @complexity `n`
     */
    get nextSibling(): AstNode;
    /**
     * 前一个兄弟节点
     * @complexity `n`
     */
    get previousSibling(): AstNode;
    /**
     * 是否具有某属性
     * @param {PropertyKey} key 属性键
     */
    hasAttribute(key: PropertyKey): boolean;
    /**
     * 获取属性值。除非用于私有属性，否则总是返回字符串。
     * @template {string} T
     * @param {T} key 属性键
     * @returns {TokenAttribute<T>}
     */
    getAttribute<T extends string>(key: T): import("../../typings/node").TokenAttribute<T>;
    /**
     * 设置属性
     * @template {string} T
     * @param {T} key 属性键
     * @param {TokenAttribute<T>} value 属性值
     */
    setAttribute<T_1 extends string>(key: T_1, value: import("../../typings/node").TokenAttribute<T_1>): AstNode;
    /**
     * 可见部分
     * @param {string} separator 子节点间的连接符
     * @returns {string}
     * @complexity `n`
     */
    text(separator?: string): string;
    /**
     * 移除子节点
     * @param {number} i 移除位置
     */
    removeAt(i: number): AstNode;
    /**
     * 插入子节点
     * @template {this} T
     * @param {T} node 待插入的子节点
     * @param {number} i 插入位置
     * @complexity `n`
     */
    insertAt<T_2 extends AstNode>(node: T_2, i?: number): T_2;
    /**
     * 合并相邻的文本子节点
     * @complexity `n`
     */
    normalize(): void;
    /** 获取根节点 */
    getRootNode(): AstNode;
    /**
     * 将字符位置转换为行列号
     * @param {number} index 字符位置
     * @complexity `n`
     */
    posFromIndex(index: number): {
        top: number;
        left: number;
    };
    /** 第一个子节点前的间距 */
    getPadding(): number;
    /** 子节点间距 */
    getGaps(): number;
    /**
     * 获取当前节点的相对字符位置，或其第`j`个子节点的相对字符位置
     * @param {number|undefined} j 子节点序号
     * @complexity `n`
     */
    getRelativeIndex(j: number | undefined): number;
    /**
     * 行数
     * @complexity `n`
     */
    get offsetHeight(): number;
    /**
     * 最后一行的列数
     * @complexity `n`
     */
    get offsetWidth(): number;
    #private;
}
declare namespace AstNode {
    export { TokenAttribute };
}
type TokenAttribute<T> = import('../../typings/node').TokenAttribute<T>;
