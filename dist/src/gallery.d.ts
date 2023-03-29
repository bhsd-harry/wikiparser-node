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
}
import Token = require(".");
