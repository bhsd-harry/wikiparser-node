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
    /** 内部wikitext */
    get innerText(): string;
    /** @override */
    override print(): string;
    /**
     * @override
     * @param {number} start 起始位置
     */
    override lint(start?: number): any;
    /**
     * @override
     * @param {string} selector
     */
    override toString(selector: string): string;
    /** @override */
    override cloneNode(): CommentToken;
}
import NowikiToken = require(".");
