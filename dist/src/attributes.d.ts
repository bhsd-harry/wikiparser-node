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
    /** getAttrs()方法的getter写法 */
    get attributes(): {
        [k: string]: string | boolean;
    };
    set className(arg: string);
    /** 以字符串表示的class属性 */
    get className(): string;
    /** 以Set表示的class属性 */
    get classList(): Set<string>;
    set id(arg: string);
    /** id属性 */
    get id(): string;
    /** 是否含有无效属性 */
    get sanitized(): boolean;
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
     */
    override print(this: AttributesToken & {
        parentNode: import("./html");
    }): string;
    /** 清理标签属性 */
    sanitize(): void;
    /** @override */
    override cloneNode(): AttributesToken;
    /**
     * 所有无效属性
     * @returns {AtomToken[]}
     */
    getDirtyAttrs(): AtomToken[];
    /**
     * @override
     * @param {AttributeToken} token 待插入的子节点
     * @param {number} i 插入位置
     * @throws `RangeError` 不是AttributeToken或标签不匹配
     */
    override insertAt(token: AttributeToken, i?: number): AttributeToken;
    /**
     * 设置标签属性
     * @param {string} key 属性键
     * @param {string|boolean} value 属性值
     * @throws `RangeError` 扩展标签属性不能包含">"
     * @throws `RangeError` 无效的属性名
     */
    setAttr(key: string, value: string | boolean): void;
    /**
     * 标签是否具有某属性
     * @param {string} key 属性键
     */
    hasAttr(key: string): boolean;
    /** 获取全部的标签属性名 */
    getAttrNames(): Set<any>;
    /** 标签是否具有任意属性 */
    hasAttrs(): boolean;
    /** 获取全部标签属性 */
    getAttrs(): {
        [k: string]: string | boolean;
    };
    /**
     * 移除标签属性
     * @param {string} key 属性键
     */
    removeAttr(key: string): void;
    /**
     * 开关标签属性
     * @param {string} key 属性键
     * @param {boolean|undefined} force 强制开启或关闭
     * @throws `RangeError` 不为Boolean类型的属性值
     */
    toggleAttr(key: string, force: boolean | undefined): void;
    /**
     * @override
     * @param {string} selector
     */
    override toString(selector: string): string;
    /** @override */
    override text(): string;
    #private;
}
import Token = require(".");
import AttributeToken = require("./attribute");
import AtomToken = require("./atom");
