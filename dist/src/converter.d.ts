export = ConverterToken;
/**
 * 转换
 * @classdesc `{childNodes: [ConverterFlagsToken, ...ConverterRuleToken]}`
 */
declare class ConverterToken extends Token {
    /**
     * @param {string[]} flags 转换类型标记
     * @param {string[]} rules 转换规则
     * @param {import('../../typings/token').accum} accum
     */
    constructor(flags: string[], rules: string[], config?: import("../../typings/token").ParserConfig, accum?: import('../../typings/token').accum);
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
     * @param {number} i 子节点位置
     */
    override getGaps(i?: number): 1 | 0;
    /** @override */
    override print(): any;
}
import Token = require(".");
