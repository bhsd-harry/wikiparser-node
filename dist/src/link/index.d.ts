export = LinkToken;
/**
 * 内链
 * @classdesc `{childNodes: [AtomToken, ?Token]}`
 */
declare class LinkToken extends Token {
    /**
     * @param {string} link 链接标题
     * @param {string|undefined} linkText 链接显示文字
     * @param {import('../../../typings/token').accum} accum
     * @param {string} delimiter `|`
     */
    constructor(link: string, linkText: string | undefined, config?: import("../../../typings/token").ParserConfig, accum?: import('../../../typings/token').accum, delimiter?: string);
    set link(arg: import("../../lib/title"));
    /** 完整链接，和FileToken保持一致 */
    get link(): import("../../lib/title");
    set selfLink(arg: boolean);
    /** 是否链接到自身 */
    get selfLink(): boolean;
    set fragment(arg: string);
    /** fragment */
    get fragment(): string;
    set interwiki(arg: string);
    /** interwiki */
    get interwiki(): string;
    /** 链接显示文字 */
    get innerText(): string;
    /**
     * @override
     * @template {string} T
     * @param {T} key 属性键
     * @param {import('../../../typings/node').TokenAttribute<T>} value 属性值
     */
    override setAttribute<T extends string>(key: T, value: import("../../../typings/node").TokenAttribute<T>): this | LinkToken;
    /**
     * @override
     * @param {string} selector
     */
    override toString(selector: string): string;
    /** @override */
    override text(): string;
    /** @override */
    override print(): string;
    /**
     * @override
     * @this {LinkToken & {constructor: typeof LinkToken}}
     */
    override cloneNode(this: LinkToken & {
        constructor: typeof LinkToken;
    }): LinkToken;
    /**
     * 设置链接目标
     * @param {string} link 链接目标
     * @throws `SyntaxError` 非法的链接目标
     */
    setTarget(link: string): void;
    /**
     * 设置跨语言链接
     * @param {string} lang 语言前缀
     * @param {string} link 页面标题
     * @throws `SyntaxError` 非法的跨语言链接
     */
    setLangLink(lang: string, link: string): void;
    /**
     * 设置fragment
     * @param {string} fragment fragment
     */
    setFragment(fragment: string): void;
    /**
     * 修改为到自身的链接
     * @param {string} fragment fragment
     * @throws `RangeError` 空fragment
     */
    asSelfLink(fragment?: string): void;
    /**
     * 设置链接显示文字
     * @param {string} linkText 链接显示文字
     * @throws `SyntaxError` 非法的链接显示文字
     */
    setLinkText(linkText?: string): void;
    /**
     * 自动生成管道符后的链接文字
     * @throws `Error` 带有"#"或"%"时不可用
     */
    pipeTrick(): void;
    #private;
}
import Token = require("..");
