export = AttributeToken;
/**
 * 扩展和HTML标签属性
 * @classdesc `{childNodes: [AtomToken, Token|AtomToken]}`
 */
declare class AttributeToken extends Token {
    /**
     * @param {'ext-attr'|'html-attr'|'table-attr'} type 标签类型
     * @param {string} tag 标签名
     * @param {string} key 属性名
     * @param {string} equal 等号
     * @param {string} value 属性值
     * @param {string[]} quotes 引号
     * @param {import('../../typings/token').accum} accum
     */
    constructor(type: 'ext-attr' | 'html-attr' | 'table-attr', tag: string, key: string, equal?: string, value?: string, quotes?: string[], config?: import("../../typings/token").ParserConfig, accum?: import('../../typings/token').accum);
    /** 引号是否匹配 */
    get balanced(): boolean;
    /** getValue()的getter */
    get value(): string | true;
    /** 标签名 */
    get tag(): string;
    type: "ext-attr" | "html-attr" | "table-attr";
    /**
     * @override
     * @returns {string}
     */
    override toString(selector: any): string;
    /**
     * @override
     * @returns {string}
     */
    override text(): string;
    /**
     * @override
     * @param {number} start 起始位置
     */
    override lint(start: number): import("../../typings/token").LintError[];
    /** 获取属性值 */
    getValue(): string | true;
    #private;
}
declare namespace AttributeToken {
    export { ParserConfig };
}
import Token = require(".");
type ParserConfig = import('../../typings/token').ParserConfig;
