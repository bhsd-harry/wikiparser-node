export = AstElement;
/** 类似HTMLElement */
declare class AstElement extends AstNode {
    /** @type {string} */ name: string;
    /** 子节点总数 */
    get length(): number;
    /**
     * 全部非文本子节点
     * @complexity `n`
     */
    get children(): AstElement[];
    /**
     * 首位非文本子节点
     * @returns {this}
     */
    get firstElementChild(): AstElement;
    /**
     * 末位非文本子节点
     * @complexity `n`
     */
    get lastElementChild(): AstElement;
    /**
     * 非文本子节点总数
     * @complexity `n`
     */
    get childElementCount(): number;
    /** 父节点 */
    get parentElement(): this;
    /**
     * AstElement.prototype.text()的getter写法
     * @complexity `n`
     */
    get outerText(): string;
    /**
     * 不可见
     */
    get hidden(): boolean;
    /**
     * 后一个可见的兄弟节点
     * @complexity `n`
     */
    get nextVisibleSibling(): this;
    /**
     * 前一个可见的兄弟节点
     * @complexity `n`
     */
    get previousVisibleSibling(): this;
    /** 内部高度 */
    get clientHeight(): number;
    /** 内部宽度 */
    get clientWidth(): number;
    /**
     * 销毁
     * @complexity `n`
     */
    destroy(): void;
    /**
     * 检查是否符合选择器
     * @param {string|SelectorArray[]} selector
     * @returns {boolean}
     * @complexity `n`
     */
    matches(selector: string | SelectorArray[]): boolean;
    /**
     * 符合选择器的第一个后代节点
     * @param {string} selector
     * @returns {this|undefined}
     * @complexity `n`
     */
    querySelector(selector: string): this | undefined;
    /**
     * 符合选择器的所有后代节点
     * @param {string} selector
     * @complexity `n`
     */
    querySelectorAll(selector: string): AstElement[];
    /**
     * id选择器
     * @param {string} id id名
     */
    getElementById(id: string): AstElement;
    /**
     * 类选择器
     * @param {string} className 类名之一
     */
    getElementsByClassName(className: string): AstElement[];
    /**
     * 标签名选择器
     * @param {string} name 标签名
     */
    getElementsByTagName(name: string): AstElement[];
    /**
     * 获取某一行的wikitext
     * @param {number} n 行号
     */
    getLine(n: number): string;
    /**
     * 在开头批量插入子节点
     * @param {...this} elements 插入节点
     * @complexity `n`
     */
    prepend(...elements: AstElement[]): void;
    /**
     * 最近的祖先节点
     * @param {string} selector
     */
    closest(selector: string): this;
    /**
     * 在末尾批量插入子节点
     * @param {...this} elements 插入节点
     * @complexity `n`
     */
    append(...elements: AstElement[]): void;
    /**
     * 批量替换子节点
     * @param {...this} elements 新的子节点
     * @complexity `n`
     */
    replaceChildren(...elements: AstElement[]): void;
    /**
     * 修改文本子节点
     * @param {string} str 新文本
     * @param {number} i 子节点位置
     * @throws `RangeError` 对应位置的子节点不是文本节点
     */
    setText(str: string, i?: number): string;
    /**
     * 还原为wikitext
     * @param {string} selector
     * @param {string} separator 子节点间的连接符
     * @returns {string}
     */
    toString(selector: string, separator?: string): string;
    /**
     * Linter
     * @param {number} start 起始位置
     */
    lint(start?: number): import("../../typings/token").LintError[];
    /**
     * 以HTML格式打印
     * @param {import('../../typings/node').printOpt} opt 选项
     * @returns {string}
     */
    print(opt?: import('../../typings/node').printOpt): string;
    /**
     * 保存为JSON
     * @param {string} file 文件名
     * @returns {Record<string, *>}
     */
    json(file: string): Record<string, any>;
    /**
     * 输出AST
     * @param {number} depth 当前深度
     */
    echo(depth?: number): void;
    #private;
}
declare namespace AstElement {
    export { SelectorArray };
}
import AstNode = require("./node");
type SelectorArray = import('../../typings/parser').SelectorArray;
