export = ImagemapLinkToken;
/**
 * `<imagemap>`内的链接
 * @classdesc `{childNodes: [AstText, LinkToken|ExtLinkToken, NoincludeToken]}`
 */
declare class ImagemapLinkToken extends Token {
    /**
     * @param {string} pre 链接前的文本
     * @param {[string, string, string|Title]} linkStuff 内外链接
     * @param {string} post 链接后的文本
     * @param {import('../../typings/token').accum} accum
     */
    constructor(pre: string, linkStuff: [string, string, string | Title], post: string, config: any, accum: import('../../typings/token').accum);
}
import Token = require(".");
import Title = require("../lib/title");
