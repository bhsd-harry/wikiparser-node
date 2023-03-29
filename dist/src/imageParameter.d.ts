export = ImageParameterToken;
/**
 * 图片参数
 * @classdesc `{childNodes: ...(AstText|Token)}`
 */
declare class ImageParameterToken extends Token {
    /**
     * @param {string} str 图片参数
     * @param {import('../../typings/token').accum} accum
     */
    constructor(str: string, config?: import("../../typings/token").ParserConfig, accum?: import('../../typings/token').accum);
    set link(arg: string | Title);
    /** 图片链接 */
    get link(): string | Title;
    set value(arg: string | true);
    /** getValue()的getter */
    get value(): string | true;
    /** 图片大小 */
    get size(): {
        width: string;
        height: string;
    };
    set width(arg: string);
    /** 图片宽度 */
    get width(): string;
    set height(arg: string);
    /** 图片高度 */
    get height(): string;
    /**
     * @override
     * @param {string} selector
     */
    override toString(selector: string): string;
    /** @override */
    override text(): string;
    /** @override */
    override print(): string;
    /** @override */
    override cloneNode(): ImageParameterToken;
    /**
     * @override
     * @template {Token} T
     * @param {T} token 待插入的子节点
     * @param {number} i 插入位置
     * @complexity `n`
     * @throws `Error` 不接受自定义输入的图片参数
     */
    override insertAt<T extends Token>(token: T, i?: number): T extends Token ? Token : AstText;
    /**
     * 获取参数值
     * @complexity `n`
     */
    getValue(): string | true;
    /**
     * 设置参数值
     * @param {string|boolean} value 参数值
     * @complexity `n`
     * @throws	SyntaxError` 非法的参数值
     */
    setValue(value: string | boolean): void;
    #private;
}
import Token = require(".");
import Title = require("../lib/title");
import AstText = require("../lib/text");
