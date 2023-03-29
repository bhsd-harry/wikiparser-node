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
    set variant(arg: string);
    /** 语言变体 */
    get variant(): string;
    set unidirectional(arg: boolean);
    /** 是否是单向转换 */
    get unidirectional(): boolean;
    /** 是否是双向转换 */
    get bidirectional(): boolean;
    /**
     * @override
     * @param {string} selector
     * @returns {string}
     */
    override toString(selector: string): string;
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
    override print(): string;
    /** @override */
    override cloneNode(): ConverterRuleToken;
    /**
     * @override
     * @throws `Error` 请勿手动插入子节点
     */
    override insertAt(): void;
    /** 修改为不转换 */
    noConvert(): void;
    /**
     * 设置转换目标
     * @param {string} to 转换目标
     * @throws `SyntaxError` 非法的转换目标
     */
    setTo(to: string): void;
    /**
     * 设置语言变体
     * @param {string} variant 语言变体
     * @throws `RangeError` 无效的语言变体
     */
    setVariant(variant: string): void;
    /**
     * 设置转换原文
     * @param {string} from 转换原文
     * @throws `Error` 尚未指定语言变体
     * @throws `SyntaxError` 非法的转换原文
     */
    setFrom(from: string): void;
    /**
     * 修改为单向转换
     * @param {string} from 转换来源
     */
    makeUnidirectional(from: string): void;
    /** 修改为双向转换 */
    makeBidirectional(): void;
}
import Token = require(".");
