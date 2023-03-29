export = ImagemapToken;
/**
 * `<imagemap>`
 * @classdesc `{childNodes: ...NoincludeToken, GalleryImageToken, ...(NoincludeToken|ImagemapLinkToken|AstText)}`
 */
declare class ImagemapToken extends Token {
    /**
     * @param {string} inner 标签内部wikitext
     * @param {import('../../typings/token').accum} accum
     * @throws `SyntaxError` 没有合法图片
     */
    constructor(inner: string, config?: import("../../typings/token").ParserConfig, accum?: import('../../typings/token').accum);
    /**
     * 图片
     * @returns {GalleryImageToken}
     */
    get image(): GalleryImageToken;
    /**
     * @override
     */
    override toString(selector: any): string;
    /** @override */
    override text(): string;
    /** @override */
    override print(): string;
    /**
     * @override
     * @param {number} start 起始位置
     */
    override lint(start: number): import("../../typings/token").LintError[];
}
import Token = require(".");
import GalleryImageToken = require("./link/galleryImage");
