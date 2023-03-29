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
     * 是否无转换
     * @this {ConverterToken & {lastChild: ConverterRuleToken}}
     */
    get noConvert(): boolean;
    /** flags */
    get flags(): Set<string>;
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
     * @param {number} i 子节点位置
     */
    override getGaps(i?: number): 1 | 0;
    /** @override */
    override print(): string;
    /** @override */
    override cloneNode(): ConverterToken;
    /**
     * 获取所有转换类型标记
     * @this {{firstChild: ConverterFlagsToken}}
     */
    getAllFlags(this: {
        firstChild: ConverterFlagsToken;
    }): Set<string>;
    /**
     * 获取有效的转换类型标记
     * @this {{firstChild: ConverterFlagsToken}}
     */
    getEffectiveFlags(this: {
        firstChild: ConverterFlagsToken;
    }): Set<string>;
    /**
     * 获取未知的转换类型标记
     * @this {{firstChild: ConverterFlagsToken}}
     */
    getUnknownFlags(this: {
        firstChild: ConverterFlagsToken;
    }): Set<string>;
    /**
     * 是否具有某转换类型标记
     * @this {{firstChild: ConverterFlagsToken}}
     * @param {string} flag 转换类型标记
     */
    hasFlag(this: {
        firstChild: ConverterFlagsToken;
    }, flag: string): boolean;
    /**
     * 是否具有某有效的转换类型标记
     * @this {{firstChild: ConverterFlagsToken}}
     * @param {string} flag 转换类型标记
     */
    hasEffectiveFlag(this: {
        firstChild: ConverterFlagsToken;
    }, flag: string): boolean;
    /**
     * 移除转换类型标记
     * @this {{firstChild: ConverterFlagsToken}}
     * @param {string} flag 转换类型标记
     */
    removeFlag(this: {
        firstChild: ConverterFlagsToken;
    }, flag: string): void;
    /**
     * 设置转换类型标记
     * @this {{firstChild: ConverterFlagsToken}}
     * @param {string} flag 转换类型标记
     */
    setFlag(this: {
        firstChild: ConverterFlagsToken;
    }, flag: string): void;
    /**
     * 开关某转换类型标记
     * @this {{firstChild: ConverterFlagsToken}}
     * @param {string} flag 转换类型标记
     */
    toggleFlag(this: {
        firstChild: ConverterFlagsToken;
    }, flag: string): void;
}
import Token = require(".");
import ConverterFlagsToken = require("./converterFlags");
