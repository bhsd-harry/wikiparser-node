export = ConverterRuleToken;
/**
 * 转换规则
 * @classdesc `{childNodes: ...AtomToken)}`
 */
declare class ConverterRuleToken extends Token {
    /**
     * @param {string} rule 转换规则
     * @param {boolean} hasColon 是否带有":"
     * @param {import('../../typings/token').accum} accum
     */
    constructor(rule: string, hasColon?: boolean, config?: import("../../typings/token").ParserConfig, accum?: import('../../typings/token').accum);
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
    /**
     * @override
     * @param {number} i 子节点序号
     */
    override getGaps(i?: number): 1 | 2;
    /** @override */
    override print(): any;
}
import Token = require(".");
