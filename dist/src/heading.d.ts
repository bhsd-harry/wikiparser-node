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
    /**
     * @override
     * @returns {string}
     */
    override toString(selector: any): string;
    /**
     * @override
     * @returns {string}
     */
    override text(): string;
    /** @override */
    override print(): string;
    /**
     * @override
     * @param {number} start 起始位置
     */
    override lint(start: number): import("../../typings/token").LintError[];
}
import Token = require(".");
