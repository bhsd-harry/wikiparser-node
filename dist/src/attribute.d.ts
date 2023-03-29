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
    set value(arg: string | true);
    /** getValue()的getter */
    get value(): string | true;
    /** 标签名 */
    get tag(): string;
    type: "ext-attr" | "html-attr" | "table-attr";
    /**
     * @override
     * @param {string} selector
     * @returns {string}
     */
    override toString(selector: string): string;
    /**
     * @override
     * @returns {string}
     */
    override text(): string;
    /** @override */
    override print(): string;
    /** 获取属性值 */
    getValue(): string | true;
    /** @override */
    override cloneNode(): import("./attribute");
    /** 转义等号 */
    escape(): void;
    /** 闭合引号 */
    close(): void;
    /**
     * 设置属性值
     * @param {string|boolean} value 参数值
     * @throws `SyntaxError` 非法的标签属性
     */
    setValue(value: string | boolean): void;
    /**
     * 修改属性名
     * @param {string} key 新属性名
     * @throws `Error` title属性不能更名
     * @throws `SyntaxError` 非法的模板参数名
     */
    rename(key: string): void;
    #private;
}
declare namespace AttributeToken {
    export { ParserConfig };
}
import Token = require(".");
type ParserConfig = import('../../typings/token').ParserConfig;
