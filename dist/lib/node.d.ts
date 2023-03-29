export = AstNode;
/** 类似Node */
declare class AstNode {
    /** @type {string} */ type: string;
    /** @type {this[]} */ childNodes: this[];
    /** 首位子节点 */
    get firstChild(): this;
    /** 末位子节点 */
    get lastChild(): this;
    /** 父节点 */
    get parentNode(): this;
    /**
     * 后一个兄弟节点
     * @complexity `n`
     */
    get nextSibling(): this;
    /**
     * 前一个兄弟节点
     * @complexity `n`
     */
    get previousSibling(): this;
    /**
     * 后一个非文本兄弟节点
     * @complexity `n`
     * @returns {this}
     */
    get nextElementSibling(): this;
    /**
     * 前一个非文本兄弟节点
     * @complexity `n`
     * @returns {this}
     */
    get previousElementSibling(): this;
    /** 是否具有根节点 */
    get isConnected(): any;
    /** 不是自身的根节点 */
    get ownerDocument(): any;
    /**
     * 后方是否还有其他节点（不含后代）
     * @returns {boolean}
     * @complexity `n`
     */
    get eof(): boolean;
    /**
     * 标记仅用于代码调试的方法
     * @param {string} method
     * @throws `Error`
     */
    debugOnly(method?: string): void;
    /**
     * 抛出`TypeError`
     * @param {string} method
     * @param  {...string} types 可接受的参数类型
     */
    typeError(method: string, ...types: string[]): never;
    /**
     * 冻结部分属性
     * @param {string|string[]} keys 属性键
     * @param {boolean} permanent 是否永久
     */
    seal(keys: string | string[], permanent: boolean): void;
    /**
     * 是否是全同节点
     * @param {this} node 待比较的节点
     * @throws `assert.AssertionError`
     */
    isEqualNode(node: this): boolean;
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
    setAttribute<T_1 extends string>(key: T_1, value: import("../../typings/node").TokenAttribute<T_1>): this;
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
    removeAt(i: number): this;
    /**
     * 插入子节点
     * @template {this} T
     * @param {T} node 待插入的子节点
     * @param {number} i 插入位置
     * @complexity `n`
     * @throws `RangeError` 不能插入祖先节点
     */
    insertAt<T_2 extends AstNode>(node: T_2, i?: number): T_2;
    /**
     * 移除子节点
     * @template {this} T
     * @param {T} node 子节点
     * @complexity `n`
     */
    removeChild<T_3 extends AstNode>(node: T_3): T_3;
    /**
     * 在末尾插入子节点
     * @template {this} T
     * @param {T} node 插入节点
     * @complexity `n`
     */
    appendChild<T_4 extends AstNode>(node: T_4): T_4;
    /**
     * 在指定位置前插入子节点
     * @template {this} T
     * @param {T} child 插入节点
     * @param {this} reference 指定位置处的子节点
     * @complexity `n`
     */
    insertBefore<T_5 extends AstNode>(child: T_5, reference: AstNode): T_5;
    /**
     * 替换子节点
     * @template {this} T
     * @param {this} newChild 新子节点
     * @param {T} oldChild 原子节点
     * @complexity `n`
     */
    replaceChild<T_6 extends AstNode>(newChild: AstNode, oldChild: T_6): T_6;
    /**
     * 在后方批量插入兄弟节点
     * @param {...this} nodes 插入节点
     * @complexity `n`
     */
    after(...nodes: AstNode[]): void;
    /**
     * 在前方批量插入兄弟节点
     * @param {...this} nodes 插入节点
     * @complexity `n`
     */
    before(...nodes: AstNode[]): void;
    /**
     * 移除当前节点
     * @complexity `n`
     * @throws `Error` 不存在父节点
     */
    remove(): void;
    /**
     * 将当前节点批量替换为新的节点
     * @param {...this} nodes 插入节点
     * @complexity `n`
     */
    replaceWith(...nodes: AstNode[]): void;
    /**
     * 是自身或后代节点
     * @param {this} node 待检测节点
     * @returns {boolean}
     * @complexity `n`
     */
    contains(node: AstNode): boolean;
    /**
     * 添加事件监听
     * @param {string|string[]} types 事件类型
     * @param {AstListener} listener 监听函数
     * @param {{once: boolean}} options 选项
     */
    addEventListener(types: string | string[], listener: AstListener, options: {
        once: boolean;
    }): void;
    /**
     * 移除事件监听
     * @param {string|string[]} types 事件类型
     * @param {AstListener} listener 监听函数
     */
    removeEventListener(types: string | string[], listener: AstListener): void;
    /**
     * 移除事件的所有监听
     * @param {string|string[]} types 事件类型
     */
    removeAllEventListeners(types: string | string[]): void;
    /**
     * 列举事件监听
     * @param {string} type 事件类型
     * @returns {AstListener[]}
     */
    listEventListeners(type: string): AstListener[];
    /**
     * 触发事件
     * @param {import('../../typings/event').AstEvent} e 事件对象
     * @param {*} data 事件数据
     */
    dispatchEvent(e: import('../../typings/event').AstEvent, data: any): void;
    /** 获取所有祖先节点 */
    getAncestors(): AstNode[];
    /**
     * 比较和另一个节点的相对位置
     * @param {this} other 待比较的节点
     * @complexity `n`
     * @throws `Error` 不在同一个语法树
     */
    compareDocumentPosition(other: AstNode): number;
    /**
     * 合并相邻的文本子节点
     * @complexity `n`
     */
    normalize(): void;
    /** 获取根节点 */
    getRootNode(): any;
    /**
     * 将字符位置转换为行列号
     * @param {number} index 字符位置
     * @complexity `n`
     */
    posFromIndex(index: number): {
        top: number;
        left: number;
    };
    /**
     * 将行列号转换为字符位置
     * @param {number} top 行号
     * @param {number} left 列号
     * @complexity `n`
     */
    indexFromPos(top: number, left: number): number;
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
     * 获取当前节点的绝对位置
     * @returns {number}
     * @complexity `n`
     */
    getAbsoluteIndex(): number;
    /**
     * 获取当前节点的行列位置和大小
     * @complexity `n`
     */
    getBoundingClientRect(): any;
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
    /**
     * 相对于父容器的行号
     * @complexity `n`
     */
    get offsetTop(): number;
    /**
     * 相对于父容器的列号
     * @complexity `n`
     */
    get offsetLeft(): number;
    /**
     * 位置、大小和padding
     * @complexity `n`
     */
    get style(): {
        padding: number;
        height: number;
        width: number;
        top: number;
        left: number;
    };
    #private;
}
declare namespace AstNode {
    export { TokenAttribute, AstListener };
}
type AstListener = import('../../typings/event').AstListener;
type TokenAttribute<T> = import('../../typings/node').TokenAttribute<T>;
