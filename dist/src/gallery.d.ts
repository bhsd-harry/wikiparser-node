export = GalleryToken;
/**
 * gallery标签
 * @classdesc `{childNodes: ...(GalleryImageToken|HiddenToken|AstText)}`
 */
declare class GalleryToken extends Token {
    /**
     * @param {string} inner 标签内部wikitext
     * @param {import('../../typings/token').accum} accum
     */
    constructor(inner: string, config?: import("../../typings/token").ParserConfig, accum?: import('../../typings/token').accum);
    /**
     * @override
     */
    override toString(selector: any): string;
    /** @override */
    override text(): string;
    /**
     * @override
     * @param {number} start 起始位置
     */
    override lint(start: number): import("../../typings/token").LintError[];
}
import Token = require(".");
