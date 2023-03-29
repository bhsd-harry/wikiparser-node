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
    /**
     * @override
     * @template {string} T
     * @param {T} key 属性键
     * @param {import('../../../typings/node').TokenAttribute<T>} value 属性值
     */
    override setAttribute<T extends string>(key: T, value: import("../../../typings/node").TokenAttribute<T>): LinkToken;
    /**
     * @override
     */
    override toString(selector: any): string;
    /** @override */
    override text(): string;
    /**
     * @override
     * @param {number} start 起始位置
     */
    override lint(start: number): import("../../../typings/token").LintError[];
    #private;
}
import Token = require("..");
