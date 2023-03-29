export = Token;
/**
 * 所有节点的基类
 * @classdesc `{childNodes: ...(AstText|Token)}`
 */
declare class Token extends AstElement {
    /**
     * @param {string} wikitext wikitext
     * @param {import('../../typings/token').accum} accum
     */
    constructor(wikitext: string, config?: import("../../typings/token").ParserConfig, halfParsed?: boolean, accum?: import('../../typings/token').accum, acceptable?: any);
    /**
     * @override
     * @template {string} T
     * @param {T} key 属性键
     * @param {TokenAttribute<T>} value 属性值
     */
    override setAttribute<T extends string>(key: T, value: import("../../typings/node").TokenAttribute<T>): Token;
    /** 是否是普通节点 */
    isPlain(): boolean;
    /**
     * @override
     * @template {string|Token} T
     * @param {T} token 待插入的子节点
     * @param {number} i 插入位置
     * @complexity `n`
     * @returns {T extends Token ? Token : AstText}
     */
    override insertAt<T_1 extends string | Token>(token: T_1, i?: number): T_1 extends Token ? Token : AstText;
    /**
     * 规范化页面标题
     * @param {string} title 标题（含或不含命名空间前缀）
     * @param {number} defaultNs 命名空间
     * @param {boolean} decode 是否需要解码
     * @param {boolean} selfLink 是否允许selfLink
     */
    normalizeTitle(title: string, defaultNs?: number, halfParsed?: boolean, decode?: boolean, selfLink?: boolean): import("../lib/title");
    /** 生成部分Token的`name`属性 */
    afterBuild(): void;
    /**
     * 解析、重构、生成部分Token的`name`属性
     * @param {number} n 最大解析层级
     * @param {boolean} include 是否嵌入
     */
    parse(n?: number, include?: boolean): Token;
    #private;
}
declare namespace Token {
    export { TokenAttribute };
}
import AstElement = require("../lib/element");
import AstText = require("../lib/text");
type TokenAttribute<T> = import('../../typings/node').TokenAttribute<T>;
