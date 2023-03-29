export = AstText;
/** 文本节点 */
declare class AstText extends AstNode {
    /** @param {string} text 包含文本 */
    constructor(text?: string);
    /** @type {string} */ data: string;
    /** @override */
    override text(): string;
    /**
     * Linter
     * @this {AstText & {parentNode: AstElement}}
     * @param {number} start 起始位置
     * @returns {LintError[]}
     */
    lint(this: import("./text") & {
        parentNode: AstElement;
    }, start: number): LintError[];
    /**
     * 替换字符串
     * @param {string} text 替换的字符串
     */
    replaceData(text?: string): void;
    #private;
}
declare namespace AstText {
    export { LintError };
}
import AstNode = require("./node");
import AstElement = require("./element");
type LintError = import('../../typings/token').LintError;
