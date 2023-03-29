export = CommentToken;
/**
 * HTML注释，不可见
 * @classdesc `{childNodes: [AstText]}`
 */
declare class CommentToken extends NowikiToken {
    /**
     * @param {string} wikitext wikitext
     * @param {boolean} closed 是否闭合
     * @param {import('../../../typings/token').accum} accum
     */
    constructor(wikitext: string, closed?: boolean, config?: import("../../../typings/token").ParserConfig, accum?: import('../../../typings/token').accum);
    closed: boolean;
    /** @override */
    override print(): string;
    /**
     * @override
     */
    override toString(selector: any): string;
}
import NowikiToken = require(".");
