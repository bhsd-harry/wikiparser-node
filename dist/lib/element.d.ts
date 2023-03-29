export = AstElement;
/** 类似HTMLElement */
declare class AstElement extends AstNode {
    /** @type {string} */ name: string;
    /** 子节点总数 */
    get length(): number;
    /**
     * 最近的祖先节点
     * @param {string} selector
     */
    closest(selector: string): AstElement;
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
     */
    setText(str: string, i?: number): string;
    /**
     * 还原为wikitext
     * @param {string} separator 子节点间的连接符
     * @returns {string}
     */
    toString(selector: any, separator?: string): string;
    /**
     * Linter
     * @param {number} start 起始位置
     */
    lint(start?: number): import("../../typings/token").LintError[];
}
import AstNode = require("./node");
