export = OnlyincludeToken;
/**
 * 嵌入时的`<onlyinclude>`
 * @classdesc `{childNodes: ...AstText|Token}`
 */
declare class OnlyincludeToken extends Token {
    /**
     * @param {string} inner 标签内部wikitext
     * @param {import('../../typings/token').accum} accum
     */
    constructor(inner: string, config?: import("../../typings/token").ParserConfig, accum?: import('../../typings/token').accum);
    /**
     * @override
     */
    override toString(selector: any): string;
}
import Token = require(".");
