export = TdToken;
/**
 * `<td>`、`<th>`和`<caption>`
 * @classdesc `{childNodes: [SyntaxToken, AttributesToken, Token]}`
 */
declare class TdToken extends TrToken {
    /**
     * @param {string} syntax 单元格语法
     * @param {string} inner 内部wikitext
     * @param {import('../../../typings/token').accum} accum
     */
    constructor(syntax: string, inner: string, config?: import("../../../typings/token").ParserConfig, accum?: import('../../../typings/token').accum);
    /**
     * 单元格类型
     * @complexity `n`
     */
    get subtype(): "caption" | "td" | "th";
    /**
     * 获取单元格语法信息
     * @returns {{subtype: 'td'|'th'|'caption'}}
     * @complexity `n`
     */
    getSyntax(): {
        subtype: 'td' | 'th' | 'caption';
    };
    /**
     * @override
     * @returns {string}
     * @complexity `n`
     */
    override toString(selector: any): string;
    /**
     * @override
     * @param {number} i 子节点位置
     */
    override getGaps(i?: number): number;
    #private;
}
import TrToken = require("./tr");
