export = ConverterFlagsToken;
/**
 * 转换flags
 * @classdesc `{childNodes: ...AtomToken}`
 */
declare class ConverterFlagsToken extends Token {
    /**
     * @param {string[]} flags 转换类型标记
     * @param {import('../../typings/token').accum} accum
     */
    constructor(flags: string[], config?: import("../../typings/token").ParserConfig, accum?: import('../../typings/token').accum);
    /**
     * @override
     */
    override toString(selector: any): string;
    /** @override */
    override text(): string;
    /**
     * 获取未知转换类型标记
     * @complexity `n`
     */
    getUnknownFlags(): Set<string>;
    /** 获取指定语言变体的转换标记 */
    getVariantFlags(): Set<string>;
    #private;
}
import Token = require(".");
