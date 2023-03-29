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
    #private;
}
import Token = require(".");
import Title = require("../lib/title");
