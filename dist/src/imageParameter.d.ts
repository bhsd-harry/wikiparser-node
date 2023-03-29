export = ImageParameterToken;
/**
 * 图片参数
 * @classdesc `{childNodes: ...(AstText|Token)}`
 */
declare class ImageParameterToken extends Token {
    /**
     * @param {string} str 图片参数
     * @param {import('../../typings/token').accum} accum
     */
    constructor(str: string, config?: import("../../typings/token").ParserConfig, accum?: import('../../typings/token').accum);
    /** 图片链接 */
    get link(): string | Title;
    /**
     * @override
     */
    override toString(selector: any): string;
    /** @override */
    override text(): string;
    /**
     * @override
     * @this {ImageParameterToken & {link: Title}}
     * @param {number} start 起始位置
     */
    override lint(this: ImageParameterToken & {
        link: Title;
    }, start: number): import("../../typings/token").LintError[];
    /** @override */
    override print(): any;
    #private;
}
import Token = require(".");
import Title = require("../lib/title");
