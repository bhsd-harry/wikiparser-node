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
     * @param {string} selector
     */
    override toString(selector: string): string;
    /** @override */
    override text(): string;
    /** @override */
    override print(): string;
    /**
     * 获取未知转换类型标记
     * @complexity `n`
     */
    getUnknownFlags(): Set<string>;
    /** 获取指定语言变体的转换标记 */
    getVariantFlags(): Set<string>;
    /** @override */
    override cloneNode(): ConverterFlagsToken;
    /**
     * @override
     * @param {AtomToken} token 待插入的子节点
     * @param {number} i 插入位置
     * @complexity `n`
     */
    override insertAt(token: AtomToken, i?: number): AtomToken;
    /** 获取所有转换类型标记 */
    getAllFlags(): Set<string>;
    /**
     * 获取转换类型标记节点
     * @param {string} flag 转换类型标记
     * @returns {AtomToken[]}
     * @complexity `n`
     */
    getFlagToken(flag: string): AtomToken[];
    /**
     * 获取有效转换类型标记
     * @complexity `n`
     */
    getEffectiveFlags(): Set<any>;
    /**
     * 是否具有某转换类型标记
     * @param {string} flag 转换类型标记
     */
    hasFlag(flag: string): boolean;
    /**
     * 是否具有某有效转换类型标记
     * @param {string} flag 转换类型标记
     * @complexity `n`
     */
    hasEffectiveFlag(flag: string): boolean;
    /**
     * 移除某转换类型标记
     * @param {string} flag 转换类型标记
     * @complexity `n²`
     */
    removeFlag(flag: string): void;
    /**
     * 设置转换类型标记
     * @param {string} flag 转换类型标记
     * @complexity `n`
     */
    setFlag(flag: string): void;
    /**
     * 开关转换类型标记
     * @param {string} flag 转换类型标记
     * @complexity `n²`
     */
    toggleFlag(flag: string): void;
    #private;
}
import Token = require(".");
import AtomToken = require("./atom");
