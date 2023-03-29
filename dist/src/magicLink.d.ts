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
    set protocol(arg: string);
    /** 协议 */
    get protocol(): string;
    set link(arg: string);
    /** 和内链保持一致 */
    get link(): string;
    /** @override */
    override cloneNode(): MagicLinkToken;
    /**
     * 获取网址
     * @throws `Error` 非标准协议
     */
    getUrl(): URL;
    /**
     * 设置外链目标
     * @param {string|URL} url 含协议的网址
     * @throws `SyntaxError` 非法的自由外链目标
     */
    setTarget(url: string | URL): void;
    /** 是否是模板或魔术字参数 */
    isParamValue(): boolean;
    #private;
}
import Token = require(".");
