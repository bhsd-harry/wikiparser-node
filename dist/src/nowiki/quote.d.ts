export = QuoteToken;
/**
 * `<hr>`
 * @classdesc `{childNodes: [AstText]}`
 */
declare class QuoteToken extends NowikiToken {
    /**
     * @param {number} n 字符串长度
     * @param {import('../../../typings/token').accum} accum
     */
    constructor(n: number, config?: import("../../../typings/token").ParserConfig, accum?: import('../../../typings/token').accum);
}
import NowikiToken = require(".");
