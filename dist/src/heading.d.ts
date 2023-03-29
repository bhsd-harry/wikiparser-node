export = HeadingToken;
/**
 * 章节标题
 * @classdesc `{childNodes: [Token, SyntaxToken]}`
 */
declare class HeadingToken extends Token {
    /**
     * @param {number} level 标题层级
     * @param {string[]} input 标题文字
     * @param {import('../../typings/token').accum} accum
     */
    constructor(level: number, input: string[], config?: import("../../typings/token").ParserConfig, accum?: import('../../typings/token').accum);
    /** 内部wikitext */
    get innerText(): string;
    /**
     * @override
     * @this {{prependNewLine(): ''|'\n'} & HeadingToken}
     * @param {string} selector
     * @returns {string}
     */
    override toString(this: {
        prependNewLine(): '' | '\n';
    } & HeadingToken, selector: string): string;
    /**
     * @override
     * @this {HeadingToken & {prependNewLine(): ''|'\n'}}
     * @returns {string}
     */
    override text(this: HeadingToken & {
        prependNewLine(): '' | '\n';
    }): string;
    /** @override */
    override print(): string;
    /** @override */
    override cloneNode(): HeadingToken;
    /**
     * 设置标题层级
     * @param {number} n 标题层级
     */
    setLevel(n: number): void;
    /** 移除标题后的不可见内容 */
    removeTrail(): void;
}
import Token = require(".");
