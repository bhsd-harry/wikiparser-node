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
     * @param {string} selector
     */
    override toString(selector: string): string;
    /**
     * @override
     * @returns {string}
     */
    override text(): string;
    /** @override */
    override print(): string;
    /** @override */
    override cloneNode(): ArgToken;
    /**
     * 移除无效部分
     * @complexity `n`
     */
    removeRedundant(): void;
    /**
     * @override
     * @param {Token} token 待插入的子节点
     * @param {number} i 插入位置
     * @throws `RangeError` 不可插入多余子节点
     */
    override insertAt(token: Token, i?: number): Token;
    /**
     * 设置参数名
     * @param {string} name 新参数名
     * @throws `SyntaxError` 非法的参数名
     */
    setName(name: string): void;
    /**
     * 设置预设值
     * @param {string} value 预设值
     * @throws `SyntaxError` 非法的参数预设值
     */
    setDefault(value: string): void;
}
import Token = require(".");
