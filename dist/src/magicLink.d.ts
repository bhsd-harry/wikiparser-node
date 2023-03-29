export = MagicLinkToken;
/**
 * 自由外链
 * @classdesc `{childNodes: [...AstText|CommentToken|IncludeToken|NoincludeToken]}`
 */
declare class MagicLinkToken extends Token {
    /**
     * @param {string} url 网址
     * @param {boolean} doubleSlash 是否接受"//"作为协议
     * @param {import('../../typings/token').accum} accum
     */
    constructor(url: string, doubleSlash: boolean, config?: import("../../typings/token").ParserConfig, accum?: import('../../typings/token').accum);
}
import Token = require(".");
