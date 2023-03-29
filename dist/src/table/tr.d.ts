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
}
import Token = require("..");
