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
    /** 所有图片 */
    get images(): this[];
    /**
     * @override
     * @param {string} selector
     */
    override toString(selector: string): string;
    /** @override */
    override text(): string;
    /** @override */
    override print(): string;
    /** @override */
    override cloneNode(): GalleryToken;
    /**
     * 插入图片
     * @param {string} file 图片文件名
     * @param {number} i 插入位置
     * @throws `SyntaxError` 非法的文件名
     */
    insertImage(file: string, i?: number): Token;
}
import Token = require(".");
