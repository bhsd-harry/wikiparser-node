export = $;
/**
 * 代替TokenCollection构造器
 * @param {AstNode|Iterable<AstNode>} arr 节点数组
 */
declare function $(arr: AstNode | Iterable<AstNode>): TokenCollection;
declare namespace $ {
    export { hasData, data, removeData, cache, CollectionCallback, AstListener };
}
import AstNode = require("../lib/node");
/** Token集合 */
declare class TokenCollection {
    /**
     * 生成匹配函数
     * @param {string} method
     * @param {string|AstNode|Iterable<AstNode>} selector
     * @returns {(token: AstNode) => boolean}
     */
    static "__#22@#matchesGenerator": (method: string, selector: string | AstNode | Iterable<AstNode>) => (token: AstNode) => boolean;
    /**
     * @param {Iterable<AstNode>} arr 节点数组
     * @param {TokenCollection} prevObject 前身
     */
    constructor(arr: Iterable<AstNode>, prevObject: TokenCollection);
    /** @type {AstNode[]} */ array: AstNode[];
    /** @type {TokenCollection} */ prevObject: TokenCollection;
    /** 数组长度 */
    get length(): number;
    /** 数组长度 */
    size(): number;
    /**
     * 抛出TypeError
     * @param {string} method
     * @param  {...string} types 可接受的参数类型
     */
    typeError(method: string, ...types: string[]): never;
    /** 转换为数组 */
    toArray(): any[];
    /**
     * 提取第n个元素
     * @template {unknown} T
     * @param {T} n 序号
     * @returns {T extends number ? AstNode : AstNode[]}
     */
    get<T extends unknown>(n: T): T extends number ? AstNode : AstNode[];
    /**
     * 循环
     * @param {CollectionCallback<void, AstNode>} callback
     */
    each(callback: CollectionCallback<void, AstNode>): TokenCollection;
    /**
     * map方法
     * @param {CollectionCallback<*, AstNode>} callback
     */
    map(callback: CollectionCallback<any, AstNode>): any[] | TokenCollection;
    /**
     * 子序列
     * @param {number} start 起点
     * @param {number} end 终点
     */
    slice(start: number, end: number): TokenCollection;
    /** 第一个元素 */
    first(): TokenCollection;
    /** 最后一个元素 */
    last(): TokenCollection;
    /**
     * 任一元素
     * @param {number} i 序号
     */
    eq(i: number): TokenCollection;
    /** 使用空字符串join */
    toString(): string;
    /**
     * 输出有效部分或设置文本
     * @template {unknown} T
     * @param {T} str 新文本
     * @returns {T extends string|CollectionCallback<string, string> ? this : string}
     */
    text<T_1 extends unknown>(str: T_1): T_1 extends string | import("../../typings/tool").CollectionCallback<string, string> ? TokenCollection : string;
    /**
     * 判断是否存在元素满足选择器
     * @param {string|AstNode|Iterable<AstNode>|CollectionCallback<boolean, AstNode>} selector
     */
    is(selector: string | AstNode | Iterable<AstNode> | CollectionCallback<boolean, AstNode>): boolean;
    /**
     * 筛选满足选择器的元素
     * @param {string|AstNode|Iterable<AstNode>|CollectionCallback<boolean, AstNode>} selector
     */
    filter(selector: string | AstNode | Iterable<AstNode> | CollectionCallback<boolean, AstNode>): TokenCollection;
    /**
     * 筛选不满足选择器的元素
     * @param {string|AstNode|Iterable<AstNode>|CollectionCallback<boolean, AstNode>} selector
     */
    not(selector: string | AstNode | Iterable<AstNode> | CollectionCallback<boolean, AstNode>): TokenCollection;
    /**
     * 搜索满足选择器的子节点
     * @param {string|AstNode|Iterable<AstNode>} selector
     */
    find(selector: string | AstNode | Iterable<AstNode>): TokenCollection;
    /**
     * 是否存在满足条件的后代节点
     * @param {string|AstNode} selector
     */
    has(selector: string | AstNode): boolean;
    /**
     * 最近的祖先
     * @param {string} selector
     */
    closest(selector: string): TokenCollection;
    /** 第一个Token节点在父容器中的序号 */
    index(): number;
    /**
     * 添加元素
     * @param {AstNode|Iterable<AstNode>} elements 新增的元素
     */
    add(elements: AstNode | Iterable<AstNode>): TokenCollection;
    /**
     * 添加prevObject
     * @param {string} selector
     */
    addBack(selector: string): TokenCollection;
    /**
     * 父元素
     * @param {string} selector
     */
    parent(selector: string): TokenCollection;
    /**
     * 祖先
     * @param {string} selector
     */
    parents(selector: string): TokenCollection;
    /**
     * nextElementSibling
     * @param {string} selector
     */
    next(selector: string): TokenCollection;
    /**
     * previousElementSibling
     * @param {string} selector
     */
    prev(selector: string): TokenCollection;
    /**
     * 所有在后的兄弟
     * @param {string} selector
     */
    nextAll(selector: string): TokenCollection;
    /**
     * 所有在前的兄弟
     * @param {string} selector
     */
    prevAll(selector: string): TokenCollection;
    /**
     * 所有在后的兄弟
     * @param {string} selector
     */
    siblings(selector: string): TokenCollection;
    /**
     * 直到选择器被满足的祖先
     * @param {string|Token|Iterable<Token>} selector
     * @param {string} filter 额外的筛选选择器
     */
    parentsUntil(selector: string | Token | Iterable<Token>, filter: string): TokenCollection;
    /**
     * 直到选择器被满足的后方兄弟
     * @param {string|Token|Iterable<Token>} selector
     * @param {string} filter 额外的筛选选择器
     */
    nextUntil(selector: string | Token | Iterable<Token>, filter: string): TokenCollection;
    /**
     * 直到选择器被满足的前方兄弟
     * @param {string|Token|Iterable<Token>} selector
     * @param {string} filter 额外的筛选选择器
     */
    prevUntil(selector: string | Token | Iterable<Token>, filter: string): TokenCollection;
    /**
     * Token子节点
     * @param {string} selector
     */
    children(selector: string): TokenCollection;
    /** 所有子节点 */
    contents(): TokenCollection;
    /**
     * 存取数据
     * @param {string|Record<string, *>} key 键
     * @param {*} value 值
     */
    data(key: string | Record<string, any>, value: any): any;
    /**
     * 删除数据
     * @param {string|string[]} name 键
     */
    removeData(name: string | string[]): TokenCollection;
    /**
     * 添加事件监听
     * @param {string|Record<string, AstListener>} events 事件名
     * @param {string|AstListener} selector
     * @param {AstListener} handler 事件处理
     */
    on(events: string | Record<string, AstListener>, selector: string | AstListener, handler: AstListener): TokenCollection;
    /**
     * 添加一次性事件监听
     * @param {string|Record<string, AstListener>} events 事件名
     * @param {string|AstListener} selector
     * @param {AstListener} handler 事件处理
     */
    one(events: string | Record<string, AstListener>, selector: string | AstListener, handler: AstListener): TokenCollection;
    /**
     * 移除事件监听
     * @param {string|Record<string, AstListener|undefined>|undefined} events 事件名
     * @param {string|AstListener} selector
     * @param {AstListener} handler 事件处理
     */
    off(events: string | Record<string, AstListener | undefined> | undefined, selector: string | AstListener, handler: AstListener): TokenCollection;
    /**
     * 触发事件
     * @param {string|Event} event 事件名
     * @param {*} data 事件数据
     */
    trigger(event: string | Event, data: any): TokenCollection;
    /**
     * 伪装触发事件
     * @param {string|Event} event 事件名
     * @param {*} data 事件数据
     */
    triggerHandler(event: string | Event, data: any): unknown;
    /**
     * 在末尾插入
     * @param {AstNode|Iterable<AstNode>|CollectionCallback<AstNode|Iterable<AstNode>, string>} content 插入内容
     * @param  {...AstNode|Iterable<AstNode>} additional 更多插入内容
     */
    append(content: AstNode | Iterable<AstNode> | CollectionCallback<AstNode | Iterable<AstNode>, string>, ...additional: (AstNode | Iterable<AstNode>)[]): TokenCollection;
    /**
     * 在开头插入
     * @param {AstNode|Iterable<AstNode>|CollectionCallback<AstNode|Iterable<AstNode>, string>} content 插入内容
     * @param  {...AstNode|Iterable<AstNode>} additional 更多插入内容
     */
    prepend(content: AstNode | Iterable<AstNode> | CollectionCallback<AstNode | Iterable<AstNode>, string>, ...additional: (AstNode | Iterable<AstNode>)[]): TokenCollection;
    /**
     * 在后方插入
     * @param {AstNode|Iterable<AstNode>|CollectionCallback<AstNode|Iterable<AstNode>, string>} content 插入内容
     * @param  {...AstNode|Iterable<AstNode>} additional 更多插入内容
     */
    before(content: AstNode | Iterable<AstNode> | CollectionCallback<AstNode | Iterable<AstNode>, string>, ...additional: (AstNode | Iterable<AstNode>)[]): TokenCollection;
    /**
     * 在前方插入
     * @param {AstNode|Iterable<AstNode>|CollectionCallback<AstNode|Iterable<AstNode>, string>} content 插入内容
     * @param  {...AstNode|Iterable<AstNode>} additional 更多插入内容
     */
    after(content: AstNode | Iterable<AstNode> | CollectionCallback<AstNode | Iterable<AstNode>, string>, ...additional: (AstNode | Iterable<AstNode>)[]): TokenCollection;
    /**
     * 替换所有子节点
     * @param {AstNode|Iterable<AstNode>|CollectionCallback<AstNode|Iterable<AstNode>, string>} content 插入内容
     * @param  {...AstNode|Iterable<AstNode>} additional 更多插入内容
     */
    html(content: AstNode | Iterable<AstNode> | CollectionCallback<AstNode | Iterable<AstNode>, string>): string | TokenCollection;
    /**
     * 替换自身
     * @param {AstNode|Iterable<AstNode>|CollectionCallback<AstNode|Iterable<AstNode>, string>} content 插入内容
     * @param  {...AstNode|Iterable<AstNode>} additional 更多插入内容
     */
    replaceWith(content: AstNode | Iterable<AstNode> | CollectionCallback<AstNode | Iterable<AstNode>, string>): TokenCollection;
    /**
     * 移除自身
     * @param {string} selector
     */
    remove(selector: string): TokenCollection;
    /**
     * 移除自身
     * @param {string} selector
     */
    detach(selector: string): TokenCollection;
    /** 清空子节点 */
    empty(): TokenCollection;
    /**
     * 深拷贝
     * @param {boolean} withData 是否复制数据
     */
    clone(withData: boolean): TokenCollection;
    /**
     * 插入到末尾
     * @param {Token|Iterable<Token>} target 目标位置
     */
    appendTo(target: Token | Iterable<Token>): TokenCollection;
    /**
     * 插入到开头
     * @param {Token|Iterable<Token>} target 目标位置
     */
    prependTo(target: Token | Iterable<Token>): TokenCollection;
    /**
     * 插入到前方
     * @param {Token|Iterable<Token>} target 目标位置
     */
    insertBefore(target: Token | Iterable<Token>): TokenCollection;
    /**
     * 插入到后方
     * @param {Token|Iterable<Token>} target 目标位置
     */
    insertAfter(target: Token | Iterable<Token>): TokenCollection;
    /**
     * 替换全部
     * @param {Token|Iterable<Token>} target 目标位置
     */
    replaceAll(target: Token | Iterable<Token>): TokenCollection;
    /**
     * 获取几何属性
     * @param {string|string[]} key 属性键
     */
    css(key: string | string[]): number | {
        [k: string]: number;
    };
    /**
     * 查询或修改值
     * @param {string|boolean|(string|boolean)[]|CollectionCallback<string, string|boolean>} value 值
     */
    val(value: string | boolean | (string | boolean)[] | CollectionCallback<string, string | boolean>): any;
    /**
     * 标签属性
     * @param {string|Record<string, string|boolean>} name 属性名
     * @param {string|boolean|CollectionCallback<string|boolean, string|boolean>} value 属性值
     */
    attr(name: string | Record<string, string | boolean>, value: string | boolean | CollectionCallback<string | boolean, string | boolean>): any;
    /**
     * 节点属性
     * @param {string|Record<string, string|boolean>} name 属性名
     * @param {string|boolean|CollectionCallback<string|boolean, string|boolean>} value 属性值
     */
    prop(name: string | Record<string, string | boolean>, value: string | boolean | CollectionCallback<string | boolean, string | boolean>): any;
    /**
     * 标签属性
     * @param {string} name 属性名
     */
    removeAttr(name: string): TokenCollection;
    /**
     * 节点属性
     * @param {string} name 属性名
     */
    removeProp(name: string): TokenCollection;
    /**
     * 添加class
     * @this {TokenCollection & {array: AttributesToken[]}}
     * @param {string|string[]|CollectionCallback<string|string[], string>} className 类名
     */
    addClass(this: TokenCollection & {
        array: AttributesToken[];
    }, className: string | string[] | CollectionCallback<string | string[], string>): TokenCollection & {
        array: AttributesToken[];
    };
    /**
     * 移除class
     * @this {TokenCollection & {array: AttributesToken[]}}
     * @param {undefined|string|string[]|CollectionCallback<undefined|string|string[], string>} className 类名
     */
    removeClass(this: TokenCollection & {
        array: AttributesToken[];
    }, className: undefined | string | string[] | CollectionCallback<undefined | string | string[], string>): TokenCollection & {
        array: AttributesToken[];
    };
    /**
     * 增减class
     * @this {TokenCollection & {array: AttributesToken[]}}
     * @param {string|string[]|CollectionCallback<string|string[], string>} className 类名
     * @param {boolean} state 是否增删
     */
    toggleClass(this: TokenCollection & {
        array: AttributesToken[];
    }, className: string | string[] | CollectionCallback<string | string[], string>, state: boolean): any;
    /**
     * 是否带有某class
     * @this {{array: AttributesToken[]}}
     * @param {string} className 类名
     */
    hasClass(this: {
        array: AttributesToken[];
    }, className: string): boolean;
    /**
     * 全包围
     * @param {string[]|CollectionCallback<string[], undefined>} wrapper 包裹
     * @throws `Error` 不是连续的兄弟节点
     */
    wrapAll(wrapper: string[] | CollectionCallback<string[], undefined>): TokenCollection;
    /**
     * 包裹内部
     * @param {string[]|CollectionCallback<string[], undefined>} wrapper 包裹
     */
    wrapInner(wrapper: string[] | CollectionCallback<string[], undefined>): TokenCollection;
    /**
     * 包裹自身
     * @param {string[]|CollectionCallback<string[], undefined>} wrapper 包裹
     */
    wrap(wrapper: string[] | CollectionCallback<string[], undefined>): TokenCollection;
    /** 相对于文档的位置 */
    offset(): {
        top: any;
        left: any;
    };
    /** 相对于父容器的位置 */
    position(): {
        top: number;
        left: number;
    };
    /** 高度 */
    height(): number;
    /** 宽度 */
    width(): number;
    /** 内部高度 */
    innerHeight(): number;
    /** 内部宽度 */
    innerWidth(): number;
    /** @ignore */
    [Symbol.iterator](): IterableIterator<AstNode>;
    #private;
}
declare function hasData(element: Token): boolean;
declare function data(arg0: Token, arg1: string, arg2: any): any;
declare function removeData(arg0: Token, arg1: string): void;
declare var cache: WeakMap<Token, Record<string, any>>;
type CollectionCallback<T, S> = import('../../typings/tool').CollectionCallback<T, S>;
type AstListener = import('../../typings/event').AstListener;
import Token = require("../src");
import AttributesToken = require("../src/attributes");
