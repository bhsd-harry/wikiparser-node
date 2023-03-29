export = ExtLinkToken;
/**
 * 外链
 * @classdesc `{childNodes: [MagicLinkToken, ?Token]}`
 */
declare class ExtLinkToken extends Token {
    /**
     * @param {string} url 网址
     * @param {string} space 空白字符
     * @param {string} text 链接文字
     * @param {import('../../typings/token').accum} accum
     */
    constructor(url: string, space?: string, text?: string, config?: import("../../typings/token").ParserConfig, accum?: import('../../typings/token').accum);
    /**
     * @override
     */
    override toString(selector: any): string;
    /** @override */
    override text(): string;
    /** @override */
    override print(): string;
    #private;
}
import Token = require(".");
