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
    /** @this {{firstChild: MagicLinkToken}} */
    set protocol(arg: string);
    /**
     * 协议
     * @this {{firstChild: MagicLinkToken}}
     */
    get protocol(): string;
    set link(arg: string);
    /**
     * 和内链保持一致
     * @this {{firstChild: MagicLinkToken}}
     */
    get link(): string;
    /** 链接显示文字 */
    get innerText(): string;
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
    override cloneNode(): ExtLinkToken;
    /**
     * 获取网址
     * @this {{firstChild: MagicLinkToken}}
     */
    getUrl(this: {
        firstChild: MagicLinkToken;
    }): URL;
    /**
     * 设置链接目标
     * @param {string|URL} url 网址
     * @throws `SyntaxError` 非法的外链目标
     */
    setTarget(url: string | URL): void;
    /**
     * 设置链接显示文字
     * @param {string} text 链接显示文字
     * @throws `SyntaxError` 非法的链接显示文字
     */
    setLinkText(text: string): void;
    #private;
}
import Token = require(".");
import MagicLinkToken = require("./magicLink");
