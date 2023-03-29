export = ArgToken;
/**
 * `{{{}}}`包裹的参数
 * @classdesc `{childNodes: [AtomToken, ?Token, ...HiddenToken]}`
 */
declare class ArgToken extends Token {
    /**
     * @param {string[]} parts 以'|'分隔的各部分
     * @param {import('../../typings/token').accum} accum
     * @complexity `n`
     */
    constructor(parts: string[], config?: import("../../typings/token").ParserConfig, accum?: import('../../typings/token').accum);
    /** default */
    get default(): string | false;
    /**
     * @override
     */
    override toString(selector: any): string;
    /**
     * @override
     * @returns {string}
     */
    override text(): string;
    /**
     * @override
     * @param {number} start 起始位置
     * @returns {import('../../typings/token').LintError[]}
     */
    override lint(start: number): import('../../typings/token').LintError[];
}
import Token = require(".");
