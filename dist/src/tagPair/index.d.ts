export = TagPairToken;
/**
 * 成对标签
 * @classdesc `{childNodes: [AstText|AttributesToken, AstText|Token]}`
 */
declare class TagPairToken extends Token {
    /**
     * @param {string} name 标签名
     * @param {string|Token} attr 标签属性
     * @param {string|Token} inner 内部wikitext
     * @param {string|undefined} closed 是否封闭；约定`undefined`表示自闭合，`''`表示未闭合
     * @param {import('../../../typings/token').accum} accum
     */
    constructor(name: string, attr: string | Token, inner: string | Token, closed: string | undefined, config?: import("../../../typings/token").ParserConfig, accum?: import('../../../typings/token').accum);
    set closed(arg: boolean);
    /** getter */
    get closed(): boolean;
    set selfClosing(arg: boolean);
    /** getter */
    get selfClosing(): boolean;
    /** 内部wikitext */
    get innerText(): string;
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
    #private;
}
declare namespace TagPairToken {
    export { TokenAttribute };
}
import Token = require("..");
type TokenAttribute<T> = import('../../../typings/node').TokenAttribute<T>;
