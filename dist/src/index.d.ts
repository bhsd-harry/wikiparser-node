export = Token;
/**
 * 所有节点的基类
 * @classdesc `{childNodes: ...(AstText|Token)}`
 */
declare class Token extends AstElement {
    /**
     * @param {string} wikitext wikitext
     * @param {import('../../typings/token').accum} accum
     * @param {acceptable} acceptable 可接受的子节点设置
     */
    constructor(wikitext: string, config?: import("../../typings/token").ParserConfig, halfParsed?: boolean, accum?: import('../../typings/token').accum, acceptable?: acceptable);
    /** 所有图片，包括图库 */
    get images(): Token[];
    /** 所有内链、外链和自由外链 */
    get links(): Token[];
    /** 所有模板和模块 */
    get embeds(): Token[];
    /**
     * @override
     * @template {string} T
     * @param {T} key 属性键
     * @param {TokenAttribute<T>} value 属性值
     */
    override setAttribute<T extends string>(key: T, value: import("../../typings/node").TokenAttribute<T>): Token | this;
    /** 是否是普通节点 */
    isPlain(): boolean;
    /**
     * @override
     * @template {string|Token} T
     * @param {T} token 待插入的子节点
     * @param {number} i 插入位置
     * @complexity `n`
     * @returns {T extends Token ? Token : AstText}
     * @throws `RangeError` 不可插入的子节点
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
    /**
     * @override
     * @param {number} i 移除位置
     * @returns {Token}
     * @complexity `n`
     * @throws `Error` 不可移除的子节点
     */
    override removeAt(i: number): Token;
    /**
     * 替换为同类节点
     * @param {Token} token 待替换的节点
     * @complexity `n`
     * @throws `Error` 不存在父节点
     * @throws `Error` 待替换的节点具有不同属性
     */
    safeReplaceWith(token: Token): void;
    /**
     * 创建HTML注释
     * @param {string} data 注释内容
     */
    createComment(data?: string): import("./nowiki/comment");
    /**
     * 创建标签
     * @param {string} tagName 标签名
     * @param {{selfClosing: boolean, closing: boolean}} options 选项
     * @throws `RangeError` 非法的标签名
     */
    createElement(tagName: string, { selfClosing, closing }?: {
        selfClosing: boolean;
        closing: boolean;
    }): any;
    /**
     * 创建纯文本节点
     * @param {string} data 文本内容
     */
    createTextNode(data?: string): AstText;
    /**
     * 找到给定位置所在的节点
     * @param {number} index 位置
     */
    caretPositionFromIndex(index: number): {
        offsetNode: Token;
        offset: number;
    };
    /**
     * 找到给定位置所在的节点
     * @param {number} x 列数
     * @param {number} y 行数
     */
    caretPositionFromPoint(x: number, y: number): {
        offsetNode: Token;
        offset: number;
    };
    /**
     * 找到给定位置所在的最外层节点
     * @param {number} index 位置
     * @throws `Error` 不是根节点
     */
    elementFromIndex(index: number): this;
    /**
     * 找到给定位置所在的最外层节点
     * @param {number} x 列数
     * @param {number} y 行数
     */
    elementFromPoint(x: number, y: number): this;
    /**
     * 找到给定位置所在的所有节点
     * @param {number} index 位置
     */
    elementsFromIndex(index: number): Token[];
    /**
     * 找到给定位置所在的所有节点
     * @param {number} x 列数
     * @param {number} y 行数
     */
    elementsFromPoint(x: number, y: number): Token[];
    /**
     * 判断标题是否是跨维基链接
     * @param {string} title 标题
     */
    isInterwiki(title: string): RegExpMatchArray;
    /**
     * 深拷贝所有子节点
     * @complexity `n`
     * @returns {(AstText|Token)[]}
     */
    cloneChildNodes(): (AstText | Token)[];
    /**
     * 深拷贝节点
     * @complexity `n`
     * @throws `Error` 未定义复制方法
     */
    cloneNode(): Token;
    /**
     * 获取全部章节
     * @complexity `n`
     */
    sections(): (Token | AstText)[][];
    /**
     * 获取指定章节
     * @param {number} n 章节序号
     * @complexity `n`
     */
    section(n: number): (Token | AstText)[];
    /**
     * 获取指定的外层HTML标签
     * @param {string|undefined} tag HTML标签名
     * @returns {[Token, Token]}
     * @complexity `n`
     * @throws `RangeError` 非法的标签或空标签
     */
    findEnclosingHtml(tag: string | undefined): [Token, Token];
    /**
     * 获取全部分类
     * @complexity `n`
     */
    getCategories(): any[][];
    /**
     * 重新解析单引号
     * @throws `Error` 不接受QuoteToken作为子节点
     */
    redoQuotes(): void;
    /** 解析部分魔术字 */
    solveConst(): void;
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
    export { acceptable, TokenAttribute };
}
import AstElement = require("../lib/element");
import AstText = require("../lib/text");
type acceptable = import('../../typings/token').acceptable;
type TokenAttribute<T> = import('../../typings/node').TokenAttribute<T>;
