export = TrToken;
/**
 * 表格行，含开头的换行，不含结尾的换行
 * @classdesc `{childNodes: [SyntaxToken, AttributesToken, ?Token, ...TdToken]}`
 */
declare class TrToken extends Token {
    /**
     * @param {string} syntax 表格语法
     * @param {string} attr 表格属性
     * @param {import('../../../typings/token').accum} accum
     * @param {RegExp} pattern 表格语法正则
     */
    constructor(syntax: string, attr?: string, config?: import("../../../typings/token").ParserConfig, accum?: import('../../../typings/token').accum, pattern?: RegExp);
    /** @override */
    override text(): string;
    /**
     * @override
     * @this {TrToken & {constructor: typeof TrToken}}
     */
    override cloneNode(this: TrToken & {
        constructor: typeof TrToken;
    }): TrToken;
    /**
     * @override
     * @param {string} selector
     */
    override toString(selector: string): string;
    /**
     * 转义表格语法
     * @complexity `n`
     */
    escape(): void;
    /**
     * 设置表格语法
     * @param {string} syntax 表格语法
     * @param {boolean} esc 是否需要转义
     */
    setSyntax(syntax: string, esc: boolean): void;
    /**
     * @override
     * @template {AstText|Token} T
     * @param {T} token 待插入的子节点
     * @param {number} i 插入位置
     * @returns {T}
     * @complexity `n`
     */
    override insertAt<T extends Token | AstText>(token: T, i?: number): T;
    /**
     * 获取行数
     * @returns {0|1}
     * @complexity `n`
     */
    getRowCount(): 0 | 1;
    /**
     * 获取下一行
     * @complexity `n`
     */
    getNextRow(): Token & TrToken;
    /**
     * 获取前一行
     * @complexity `n`
     */
    getPreviousRow(): Token & TrToken;
    /**
     * 获取列数
     * @complexity `n`
     */
    getColCount(): number;
    /**
     * 获取第n列
     * @param {number} n 列号
     * @param {boolean} insert 是否用于判断插入新列的位置
     * @returns {TdToken}
     * @complexity `n`
     * @throws `RangeError` 不存在对应单元格
     */
    getNthCol(n: number, insert: boolean): import("./td");
    /**
     * 插入新的单元格
     * @param {string|Token} inner 单元格内部wikitext
     * @param {import('../../../typings/table').TableCoords} coord 单元格坐标
     * @param {'td'|'th'|'caption'} subtype 单元格类型
     * @param {Record<string, string|boolean>} attr 单元格属性
     * @returns {TdToken}
     * @complexity `n`
     */
    insertTableCell(inner: string | Token, { column }: import('../../../typings/table').TableCoords, subtype?: 'td' | 'th' | 'caption', attr?: Record<string, string | boolean>): import("./td");
    #private;
}
import Token = require("..");
import AstText = require("../../lib/text");
