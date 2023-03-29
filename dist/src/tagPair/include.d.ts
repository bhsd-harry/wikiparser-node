export = IncludeToken;
/**
 * `<includeonly>`或`<noinclude>`
 * @classdesc `{childNodes: [AstText, AstText]}`
 */
declare class IncludeToken extends TagPairToken {
    /**
     * @param {string} name 标签名
     * @param {string} attr 标签属性
     * @param {string|undefined} inner 内部wikitext
     * @param {string|undefined} closed 是否封闭
     * @param {import('../../../typings/token').accum} accum
     */
    constructor(name: string, attr?: string, inner?: string | undefined, closed?: string | undefined, config?: import("../../../typings/token").ParserConfig, accum?: import('../../../typings/token').accum);
}
import TagPairToken = require(".");
