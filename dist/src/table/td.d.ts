export = TdToken;
/**
 * `<td>`、`<th>`和`<caption>`
 * @classdesc `{childNodes: [SyntaxToken, AttributesToken, Token]}`
 */
declare class TdToken extends TrToken {
    /**
     * 创建新的单元格
     * @param {string|Token} inner 内部wikitext
     * @param {'td'|'th'|'caption'} subtype 单元格类型
     * @param {Record<string, string>} attr 单元格属性
     * @param {boolean} include 是否嵌入
     * @throws `RangeError` 非法的单元格类型
     */
    static create(inner: string | Token, subtype?: 'td' | 'th' | 'caption', attr?: Record<string, string>, include?: boolean, config?: import("../../../typings/token").ParserConfig): TdToken;
    /**
     * @param {string} syntax 单元格语法
     * @param {string} inner 内部wikitext
     * @param {import('../../../typings/token').accum} accum
     */
    constructor(syntax: string, inner: string, config?: import("../../../typings/token").ParserConfig, accum?: import('../../../typings/token').accum);
    set subtype(arg: "caption" | "td" | "th");
    /**
     * 单元格类型
     * @complexity `n`
     */
    get subtype(): "caption" | "td" | "th";
    set rowspan(arg: number);
    /** rowspan */
    get rowspan(): number;
    set colspan(arg: number);
    /** colspan */
    get colspan(): number;
    /** 内部wikitext */
    get innerText(): string;
    /** 是否位于行首 */
    isIndependent(): boolean;
    /**
     * 获取单元格语法信息
     * @returns {{subtype: 'td'|'th'|'caption', escape: boolean, correction: boolean}}
     * @complexity `n`
     */
    getSyntax(): {
        subtype: 'td' | 'th' | 'caption';
        escape: boolean;
        correction: boolean;
    };
    /**
     * @override
     * @param {number} i 子节点位置
     */
    override getGaps(i?: number): number;
    /** @override */
    override print(): string;
    /** @override */
    override cloneNode(): TdToken;
    /**
     * @override
     * @template {string} T
     * @param {T} key 属性键
     * @param {TokenAttribute<T>} value 属性值
     * @returns {this}
     */
    override setAttribute<T extends string>(key: T, value: import("../../../typings/node").TokenAttribute<T>): this;
    /**
     * 改为独占一行
     * @complexity `n`
     */
    independence(): void;
    /**
     * 获取单元格属性
     * @template {string} T
     * @param {T} key 属性键
     * @returns {T extends 'rowspan'|'colspan' ? number : string|true}
     */
    getAttr<T_1 extends string>(key: T_1): T_1 extends "rowspan" | "colspan" ? number : string | true;
    /**
     * 获取全部单元格属性
     * @returns {{rowspan: number, colspan: number, [key: string]: string|true}}
     */
    getAttrs(): {
        [key: string]: string | true;
        rowspan: number;
        colspan: number;
    };
    /**
     * 设置单元格属性
     * @template {string} T
     * @param {T} key 属性键
     * @param {T extends 'rowspan'|'colspan' ? number : string|boolean} value 属性值
     */
    setAttr<T_2 extends string>(key: T_2, value: T_2 extends "rowspan" | "colspan" ? number : string | boolean): boolean;
    #private;
}
declare namespace TdToken {
    export { TokenAttribute };
}
import TrToken = require("./tr");
import Token = require("..");
type TokenAttribute<T> = import('../../../typings/node').TokenAttribute<T>;
