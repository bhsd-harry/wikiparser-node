export = HtmlToken;
/**
 * HTML标签
 * @classdesc `{childNodes: [AttributesToken]}`
 */
declare class HtmlToken extends Token {
    /**
     * @param {string} name 标签名
     * @param {AttributesToken} attr 标签属性
     * @param {boolean} closing 是否闭合
     * @param {boolean} selfClosing 是否自封闭
     * @param {import('../../typings/token').accum} accum
     */
    constructor(name: string, attr: AttributesToken, closing: boolean, selfClosing: boolean, config?: import("../../typings/token").ParserConfig, accum?: import('../../typings/token').accum);
    /** getter */
    get closing(): boolean;
    /**
     * @override
     */
    override toString(selector: any): string;
    /** @override */
    override text(): string;
    /**
     * @override
     * @param {number} start 起始位置
     */
    override lint(start: number): import("../../typings/token").LintError[];
    /**
     * 搜索匹配的标签
     * @complexity `n`
     * @throws `SyntaxError` 同时闭合和自封闭的标签
     * @throws `SyntaxError` 无效自封闭标签
     * @throws `SyntaxError` 未闭合的标签
     */
    findMatchingTag(): HtmlToken;
    #private;
}
import Token = require(".");
