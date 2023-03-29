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
    set value(arg: string);
    /** getValue()的getter */
    get value(): string;
    /**
     * 是否是重复参数
     * @this {ParameterToken & {parentNode: TranscludeToken}}
     */
    get duplicated(): boolean;
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
    /** @override */
    override getGaps(): 1 | 0;
    /** @override */
    override print(): string;
    /**
     * 获取参数值
     * @this {ParameterToken & {parentNode: TranscludeToken}}
     */
    getValue(this: ParameterToken & {
        parentNode: import("./transclude");
    }): string;
    /** @override */
    override cloneNode(): ParameterToken;
    /**
     * @override
     * @param {ParameterToken} token 待替换的节点
     * @complexity `n`
     */
    override safeReplaceWith(token: ParameterToken): void;
    /**
     * 设置参数值
     * @this {ParameterToken & {parentNode: TranscludeToken}}
     * @param {string} value 参数值
     * @throws `SyntaxError` 非法的模板参数
     */
    setValue(this: ParameterToken & {
        parentNode: import("./transclude");
    }, value: string): void;
    /**
     * 修改参数名
     * @this {ParameterToken & {parentNode: TranscludeToken}}
     * @param {string} key 新参数名
     * @param {boolean} force 是否无视冲突命名
     * @throws `Error` 仅用于模板参数
     * @throws `SyntaxError` 非法的模板参数名
     * @throws `RangeError` 更名造成重复参数
     */
    rename(this: ParameterToken & {
        parentNode: import("./transclude");
    }, key: string, force: boolean): void;
}
import Token = require(".");
