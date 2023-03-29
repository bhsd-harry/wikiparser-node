export = AstText;
/** 文本节点 */
declare class AstText extends AstNode {
    /** @param {string} text 包含文本 */
    constructor(text?: string);
    /** @type {string} */ data: string;
    /** 文本长度 */
    get length(): number;
    /** @override */
    override text(): string;
    /**
     * Linter
     * @this {AstText & {parentNode: AstElement}}
     * @param {number} start 起始位置
     * @returns {LintError[]}
     */
    lint(this: AstText & {
        parentNode: AstElement;
    }, start?: number): LintError[];
    /**
     * 替换字符串
     * @param {string} text 替换的字符串
     */
    replaceData(text?: string): void;
    /** 复制 */
    cloneNode(): AstText;
    /**
     * 在后方添加字符串
     * @param {string} text 添加的字符串
     */
    appendData(text: string): void;
    /**
     * 删减字符串
     * @param {number} offset 起始位置
     * @param {number} count 删减字符数
     */
    deleteData(offset: number, count: number): void;
    /**
     * 插入字符串
     * @param {number} offset 插入位置
     * @param {string} text 待插入的字符串
     */
    insertData(offset: number, text: string): void;
    /**
     * 提取子串
     * @param {number} offset 起始位置
     * @param {number} count 字符数
     */
    substringData(offset: number, count: number): string;
    /**
     * 将文本子节点分裂为两部分
     * @param {number} offset 分裂位置
     * @throws `RangeError` 错误的断开位置
     * @throws `Error` 没有父节点
     */
    splitText(offset: number): AstText;
    #private;
}
declare namespace AstText {
    export { LintError };
}
import AstNode = require("./node");
import AstElement = require("./element");
type LintError = import('../../typings/token').LintError;
