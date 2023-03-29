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
    /** @throws `Error` 自闭合标签或空标签 */
    set closing(arg: boolean);
    /** getter */
    get closing(): boolean;
    /** @throws `Error` 闭合标签或无效自闭合标签 */
    set selfClosing(arg: boolean);
    /** getter */
    get selfClosing(): boolean;
    /**
     * @override
     * @param {string} selector
     */
    override toString(selector: string): string;
    /** @override */
    override text(): string;
    /** @override */
    override print(): string;
    /**
     * 搜索匹配的标签
     * @complexity `n`
     * @throws `SyntaxError` 同时闭合和自封闭的标签
     * @throws `SyntaxError` 无效自封闭标签
     * @throws `SyntaxError` 未闭合的标签
     */
    findMatchingTag(): this | HtmlToken;
    /** @override */
    override cloneNode(): HtmlToken;
    /**
     * 更换标签名
     * @param {string} tag 标签名
     * @throws `RangeError` 非法的HTML标签
     */
    replaceTag(tag: string): void;
    /**
     * 修复无效自封闭标签
     * @complexity `n`
     * @throws `Error` 无法修复无效自封闭标签
     */
    fix(): void;
    #private;
}
import Token = require(".");
