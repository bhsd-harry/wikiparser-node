export = TableToken;
/**
 * 表格
 * @classdesc `{childNodes: [SyntaxToken, AttributesToken, ?Token, ...TdToken, ...TrToken, ?SyntaxToken]}`
 */
declare class TableToken extends TrToken {
    /**
     * @param {string} syntax 表格语法
     * @param {string} attr 表格属性
     * @param {import('../../../typings/token').accum} accum
     */
    constructor(syntax: string, attr?: string, config?: import("../../../typings/token").ParserConfig, accum?: import('../../../typings/token').accum);
    set closed(arg: boolean);
    /** 表格是否闭合 */
    get closed(): boolean;
    /**
     * @override
     * @template {TrToken|SyntaxToken} T
     * @param {T} token 待插入的子节点
     * @param {number} i 插入位置
     * @returns {T}
     * @complexity `n`
     * @throws `SyntaxError` 表格的闭合部分非法
     */
    override insertAt<T extends SyntaxToken | TrToken>(token: T, i?: number): T;
    /**
     * 闭合表格语法
     * @complexity `n`
     * @param {string} syntax 表格结尾语法
     * @throws `SyntaxError` 表格的闭合部分不符合语法
     */
    close(syntax?: string, halfParsed?: boolean): void;
    /**
     * @override
     * @returns {number}
     * @complexity `n`
     */
    override getRowCount(): number;
    /** @override */
    override getPreviousRow(): void;
    /**
     * @override
     * @complexity `n`
     */
    override getNextRow(): TrToken;
    /**
     * 获取第n行
     * @param {number} n 行号
     * @param {boolean} force 是否将表格自身视为第一行
     * @param {boolean} insert 是否用于判断插入新行的位置
     * @returns {TrToken}
     * @complexity `n`
     * @throws `RangeError` 不存在该行
     */
    getNthRow(n: number, force: boolean, insert: boolean): TrToken;
    /**
     * 获取所有行
     * @returns {TrToken[]}
     * @complexity `n`
     */
    getAllRows(): TrToken[];
    /**
     * 获取指定坐标的单元格
     * @param {TableCoords & TableRenderedCoords} coords 表格坐标
     * @complexity `n`
     */
    getNthCell(coords: TableCoords & TableRenderedCoords): TdToken;
    /**
     * 获取表格布局
     * @param {TableCoords & TableRenderedCoords} stop 中止条件
     * @complexity `n`
     */
    getLayout(stop?: TableCoords & TableRenderedCoords): Layout;
    /**
     * 打印表格布局
     * @complexity `n`
     */
    printLayout(): void;
    /**
     * 转换为渲染后的表格坐标
     * @param {TableCoords} coord wikitext中的表格坐标
     * @returns {TableRenderedCoords}
     * @complexity `n`
     */
    toRenderedCoords({ row, column }: TableCoords): TableRenderedCoords;
    /**
     * 转换为wikitext中的表格坐标
     * @param {TableRenderedCoords} coord 渲染后的表格坐标
     * @complexity `n`
     */
    toRawCoords({ x, y }: TableRenderedCoords): {
        row: number;
        column: any;
        start: boolean;
    };
    /**
     * 获取完整行
     * @param {number} y 行号
     * @complexity `n²`
     */
    getFullRow(y: number): Map<TdToken, boolean>;
    /**
     * 获取完整列
     * @param {number} x 列号
     * @complexity `n`
     */
    getFullCol(x: number): Map<TdToken, boolean>;
    /**
     * 设置行格式
     * @param {number} y 行号
     * @param {string|Record<string, string|boolean>} attr 表格属性
     * @param {boolean} multiRow 是否对所有单元格设置，或是仅对行首单元格设置
     * @complexity `n²`
     */
    formatTableRow(y: number, attr?: string | Record<string, string | boolean>, multiRow?: boolean): void;
    /**
     * 设置列格式
     * @param {number} x 列号
     * @param {string|Record<string, string|boolean>} attr 表格属性
     * @param {boolean} multiCol 是否对所有单元格设置，或是仅对行首单元格设置
     * @complexity `n`
     */
    formatTableCol(x: number, attr?: string | Record<string, string | boolean>, multiCol?: boolean): void;
    /**
     * 填补表格行
     * @param {number} y 行号
     * @param {string|Token} inner 填充内容
     * @param {'td'|'th'|'caption'} subtype 单元格类型
     * @param {Record<string, string>} attr 表格属性
     * @complexity `n`
     */
    fillTableRow(y: number, inner: string | Token, subtype?: 'td' | 'th' | 'caption', attr?: Record<string, string>): void;
    /**
     * 填补表格
     * @param {string|Token} inner 填充内容
     * @param {'td'|'th'|'caption'} subtype 单元格类型
     * @param {Record<string, string>} attr 表格属性
     * @complexity `n`
     */
    fillTable(inner: string | Token, subtype?: 'td' | 'th' | 'caption', attr?: Record<string, string>): void;
    /**
     * @override
     * @param {string|Token} inner 单元格内部wikitext
     * @param {TableCoords & TableRenderedCoords} coords 单元格坐标
     * @param {'td'|'th'|'caption'} subtype 单元格类型
     * @param {Record<string, string|boolean>} attr 单元格属性
     * @returns {TdToken}
     * @complexity `n`
     * @throws `RangeError` 指定的坐标不是单元格起始点
     */
    override insertTableCell(inner: string | Token, coords: TableCoords & TableRenderedCoords, subtype?: 'td' | 'th' | 'caption', attr?: Record<string, string | boolean>): TdToken;
    /**
     * 插入表格行
     * @param {number} y 行号
     * @param {Record<string, string|boolean>} attr 表格行属性
     * @param {string|Token} inner 内部wikitext
     * @param {'td'|'th'|'caption'} subtype 单元格类型
     * @param {Record<string, string|boolean>} innerAttr 单元格属性
     * @complexity `n`
     */
    insertTableRow(y: number, attr?: Record<string, string | boolean>, inner?: string | Token, subtype?: 'td' | 'th' | 'caption', innerAttr?: Record<string, string | boolean>): TrToken & import("../attributes");
    /**
     * 插入表格列
     * @param {number} x 列号
     * @param {string|Token} inner 内部wikitext
     * @param {'td'|'th'|'caption'} subtype 单元格类型
     * @param {Record<string, string>} attr 单元格属性
     * @complexity `n²`
     * @throws `RangeError` 列号过大
     */
    insertTableCol(x: number, inner: string | Token, subtype?: 'td' | 'th' | 'caption', attr?: Record<string, string>): void;
    /**
     * 移除表格行
     * @param {number} y 行号
     * @complexity `n²`
     */
    removeTableRow(y: number): TrToken;
    /**
     * 移除表格列
     * @param {number} x 列号
     * @complexity `n²`
     */
    removeTableCol(x: number): void;
    /**
     * 合并单元格
     * @param {[number, number]} xlim 列范围
     * @param {[number, number]} ylim 行范围
     * @complexity `n²`
     * @throws `RangeError` 待合并区域与外侧区域有重叠
     */
    mergeCells(xlim: [number, number], ylim: [number, number]): TdToken;
    /**
     * 分裂成多行
     * @param {TableCoords & TableRenderedCoords} coords 单元格坐标
     * @complexity `n²`
     */
    splitIntoRows(coords: TableCoords & TableRenderedCoords): void;
    /**
     * 分裂成多列
     * @param {TableCoords & TableRenderedCoords} coords 单元格坐标
     * @complexity `n²`
     */
    splitIntoCols(coords: TableCoords & TableRenderedCoords): void;
    /**
     * 分裂成单元格
     * @param {TableCoords & TableRenderedCoords} coords 单元格坐标
     * @complexity `n²`
     */
    splitIntoCells(coords: TableCoords & TableRenderedCoords): void;
    /**
     * 复制一行并插入该行之前
     * @param {number} row 行号
     * @complexity `n²`
     */
    replicateTableRow(row: number): TrToken;
    /**
     * 复制一列并插入该列之前
     * @param {number} x 列号
     * @complexity `n`
     */
    replicateTableCol(x: number): TdToken[];
    /**
     * 移动表格行
     * @param {number} y 行号
     * @param {number} before 新位置
     * @complexity `n²`
     * @throws `RangeError` 无法移动
     */
    moveTableRowBefore(y: number, before: number): TrToken;
    /**
     * 移动表格行
     * @param {number} y 行号
     * @param {number} after 新位置
     * @complexity `n²`
     * @throws `RangeError` 无法移动
     */
    moveTableRowAfter(y: number, after: number): TrToken;
    /**
     * 移动表格列
     * @param {number} x 列号
     * @param {number} before 新位置
     * @complexity `n`
     */
    moveTableColBefore(x: number, before: number): void;
    /**
     * 移动表格列
     * @param {number} x 列号
     * @param {number} after 新位置
     * @complexity `n`
     */
    moveTableColAfter(x: number, after: number): void;
    #private;
}
declare namespace TableToken {
    export { TableCoords, TableRenderedCoords };
}
import TrToken = require("./tr");
import SyntaxToken = require("../syntax");
type TableCoords = import('../../../typings/table').TableCoords;
type TableRenderedCoords = import('../../../typings/table').TableRenderedCoords;
import TdToken = require("./td");
/** @extends {Array<TableCoords[]>} */
declare class Layout extends Array<import("../../../typings/table").TableCoords[]> {
    constructor(arrayLength?: number);
    constructor(arrayLength: number);
    constructor(...items: import("../../../typings/table").TableCoords[][]);
    /**
     * 打印表格布局
     * @complexity `n`
     */
    print(): void;
}
import Token = require("..");
