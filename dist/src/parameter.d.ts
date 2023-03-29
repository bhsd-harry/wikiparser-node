export = ParameterToken;
/**
 * 模板或魔术字参数
 * @classdesc `{childNodes: [Token, Token]}`
 */
declare class ParameterToken extends Token {
    /**
     * @param {string|number} key 参数名
     * @param {string} value 参数值
     * @param {import('../../typings/token').accum} accum
     */
    constructor(key: string | number, value: string, config?: import("../../typings/token").ParserConfig, accum?: import('../../typings/token').accum);
    /** 是否是匿名参数 */
    get anon(): boolean;
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
    override getGaps(): 1 | 0;
    /**
     * @override
     * @param {number} start 起始位置
     */
    override lint(start: number): import("../../typings/token").LintError[];
}
import Token = require(".");
