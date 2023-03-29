export = TranscludeToken;
/**
 * 模板或魔术字
 * @classdesc `{childNodes: [AtomToken|SyntaxToken, ...ParameterToken]}`
 */
declare class TranscludeToken extends Token {
    /**
     * @param {string} title 模板标题或魔术字
     * @param {[string, string|undefined][]} parts 参数各部分
     * @param {import('../../typings/token').accum} accum
     * @complexity `n`
     * @throws `SyntaxError` 非法的模板名称
     */
    constructor(title: string, parts: [string, string | undefined][], config?: import("../../typings/token").ParserConfig, accum?: import('../../typings/token').accum);
    modifier: string;
    /**
     * 设置引用修饰符
     * @param {string} modifier 引用修饰符
     * @complexity `n`
     */
    setModifier(modifier?: string): boolean;
    /**
     * @override
     */
    override toString(selector: any): string;
    /**
     * @override
     * @returns {string}
     * @complexity `n`
     */
    override text(): string;
    /** @override */
    override print(): any;
    /**
     * @override
     * @param {number} start 起始位置
     */
    override lint(start: number): import("../../typings/token").LintError[];
    /** 是否是模板 */
    isTemplate(): boolean;
    /**
     * @override
     * @param {ParameterToken} token 待插入的子节点
     * @param {number} i 插入位置
     * @complexity `n`
     */
    override insertAt(token: ParameterToken, i?: number): ParameterToken;
    /**
     * 获取所有参数
     * @returns {ParameterToken[]}
     * @complexity `n`
     */
    getAllArgs(): ParameterToken[];
    /**
     * 获取匿名参数
     * @complexity `n`
     */
    getAnonArgs(): ParameterToken[];
    /**
     * 获取指定参数
     * @param {string|number} key 参数名
     * @param {boolean} exact 是否匹配匿名性
     * @param {boolean} copy 是否返回一个备份
     * @complexity `n`
     */
    getArgs(key: string | number, exact: boolean, copy?: boolean): Set<ParameterToken>;
    /**
     * 获取重名参数
     * @complexity `n`
     * @returns {[string, ParameterToken[]][]}
     */
    getDuplicatedArgs(): [string, ParameterToken[]][];
    /**
     * 对特定魔术字获取可能的取值
     * @this {ParameterToken}}
     * @throws `Error` 不是可接受的魔术字
     */
    getPossibleValues(this: ParameterToken): Token[];
    #private;
}
import Token = require(".");
import ParameterToken = require("./parameter");
