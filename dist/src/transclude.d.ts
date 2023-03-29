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
    /** 是否存在重复参数 */
    get duplication(): boolean;
    /**
     * 设置引用修饰符
     * @param {string} modifier 引用修饰符
     * @complexity `n`
     */
    setModifier(modifier?: string): boolean;
    /**
     * @override
     * @param {string} selector
     */
    override toString(selector: string): string;
    /**
     * @override
     * @returns {string}
     * @complexity `n`
     */
    override text(): string;
    /** @override */
    override print(): string;
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
    getArgs(key: string | number, exact: boolean, copy?: boolean): Set<any>;
    /**
     * 获取重名参数
     * @complexity `n`
     * @returns {[string, ParameterToken[]][]}
     * @throws `Error` 仅用于模板
     */
    getDuplicatedArgs(): [string, ParameterToken[]][];
    /**
     * 对特定魔术字获取可能的取值
     * @this {ParameterToken}}
     * @throws `Error` 不是可接受的魔术字
     */
    getPossibleValues(this: ParameterToken): Token[];
    /** @override */
    override cloneNode(): TranscludeToken;
    /** 替换引用 */
    subst(): void;
    /** 安全的替换引用 */
    safesubst(): void;
    /**
     * @override
     * @param {number} i 移除位置
     * @complexity `n`
     */
    override removeAt(i: number): ParameterToken;
    /**
     * 是否具有某参数
     * @param {string|number} key 参数名
     * @param {boolean} exact 是否匹配匿名性
     * @complexity `n`
     */
    hasArg(key: string | number, exact: boolean): boolean;
    /**
     * 获取生效的指定参数
     * @param {string|number} key 参数名
     * @param {boolean} exact 是否匹配匿名性
     * @complexity `n`
     */
    getArg(key: string | number, exact: boolean): any;
    /**
     * 移除指定参数
     * @param {string|number} key 参数名
     * @param {boolean} exact 是否匹配匿名性
     * @complexity `n`
     */
    removeArg(key: string | number, exact: boolean): void;
    /**
     * 获取所有参数名
     * @complexity `n`
     */
    getKeys(): any[];
    /**
     * 获取参数值
     * @param {string|number} key 参数名
     * @complexity `n`
     */
    getValues(key: string | number): any[];
    /**
     * 获取生效的参数值
     * @template {string|number|undefined} T
     * @param {T} key 参数名
     * @returns {T extends undefined ? Record<string, string> : string}
     * @complexity `n`
     */
    getValue<T extends string | number>(key: T): T extends undefined ? Record<string, string> : string;
    /**
     * 插入匿名参数
     * @param {string} val 参数值
     * @returns {ParameterToken}
     * @complexity `n`
     * @throws `SyntaxError` 非法的匿名参数
     */
    newAnonArg(val: string): ParameterToken;
    /**
     * 设置参数值
     * @param {string} key 参数名
     * @param {string} value 参数值
     * @complexity `n`
     * @throws `Error` 仅用于模板
     * @throws `SyntaxError` 非法的命名参数
     */
    setValue(key: string, value: string): void;
    /**
     * 将匿名参数改写为命名参数
     * @complexity `n`
     * @throws `Error` 仅用于模板
     */
    anonToNamed(): void;
    /**
     * 替换模板名
     * @param {string} title 模板名
     * @throws `Error` 仅用于模板
     * @throws `SyntaxError` 非法的模板名称
     */
    replaceTemplate(title: string): void;
    /**
     * 替换模块名
     * @param {string} title 模块名
     * @throws `Error` 仅用于模块
     * @throws `SyntaxError` 非法的模块名称
     */
    replaceModule(title: string): void;
    /**
     * 替换模块函数
     * @param {string} func 模块函数名
     * @throws `Error` 仅用于模块
     * @throws `Error` 尚未指定模块名称
     * @throws `SyntaxError` 非法的模块函数名
     */
    replaceFunction(func: string): void;
    /**
     * 是否存在重名参数
     * @complexity `n`
     * @throws `Error` 仅用于模板
     */
    hasDuplicatedArgs(): number;
    /**
     * 修复重名参数：
     * `aggressive = false`时只移除空参数和全同参数，优先保留匿名参数，否则将所有匿名参数更改为命名。
     * `aggressive = true`时还会尝试处理连续的以数字编号的参数。
     * @param {boolean} aggressive 是否使用有更大风险的修复手段
     * @complexity `n²`
     */
    fixDuplication(aggressive: boolean): string[];
    /**
     * 转义模板内的表格
     * @returns {TranscludeToken}
     * @complexity `n`
     * @throws `Error` 转义失败
     */
    escapeTables(): TranscludeToken;
    #private;
}
import Token = require(".");
import ParameterToken = require("./parameter");
