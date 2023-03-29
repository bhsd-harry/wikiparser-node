export = TableToken;
/**
 * 表格
 * @classdesc `{childNodes: [SyntaxToken, AttributesToken, ?Token, ...TdToken, ...TrToken, ?SyntaxToken]}`
 */
declare class TableToken extends TrToken {
    /** 表格是否闭合 */
    get closed(): boolean;
    /**
     * 闭合表格语法
     * @complexity `n`
     * @param {string} syntax 表格结尾语法
     */
    close(syntax?: string, halfParsed?: boolean): void;
}
import TrToken = require("./tr");
