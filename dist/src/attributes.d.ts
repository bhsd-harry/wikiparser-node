export = AttributesToken;
/**
 * 扩展和HTML标签属性
 * @classdesc `{childNodes: ...AtomToken|AttributeToken}`
 */
declare class AttributesToken extends Token {
    /**
     * @param {string} attr 标签属性
     * @param {'ext-attrs'|'html-attrs'|'table-attrs'} type 标签类型
     * @param {string} name 标签名
     * @param {import('../../typings/token').accum} accum
     */
    constructor(attr: string, type: 'ext-attrs' | 'html-attrs' | 'table-attrs', name: string, config?: import("../../typings/token").ParserConfig, accum?: import('../../typings/token').accum);
    type: "ext-attrs" | "html-attrs" | "table-attrs";
    /**
     * 所有指定属性名的AttributeToken
     * @param {string} key 属性名
     * @returns {AttributeToken[]}
     */
    getAttrTokens(key: string): AttributeToken[];
    /**
     * 制定属性名的最后一个AttributeToken
     * @param {string} key 属性名
     */
    getAttrToken(key: string): AttributeToken;
    /**
     * 获取标签属性
     * @param {string} key 属性键
     */
    getAttr(key: string): string | true;
    /**
     * @override
     * @this {AttributesToken & {parentNode: HtmlToken}}
     * @param {number} start 起始位置
     */
    override lint(this: AttributesToken & {
        parentNode: import("./html");
    }, start: number): import("../../typings/token").LintError[];
}
import Token = require(".");
import AttributeToken = require("./attribute");
