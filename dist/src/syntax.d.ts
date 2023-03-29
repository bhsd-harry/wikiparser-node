export = SyntaxToken;
/**
 * 满足特定语法格式的plain Token
 * @classdesc `{childNodes: ...AstText|Token}`
 */
declare class SyntaxToken extends Token {
    /**
     * @param {string} wikitext 语法wikitext
     * @param {RegExp} pattern 语法正则
     * @param {string} type Token.type
     * @param {import('../../typings/token').accum} accum
     * @param {import('../../typings/token').acceptable} acceptable 可接受的子节点设置
     * @throws `RangeError` 含有g修饰符的语法正则
     */
    constructor(wikitext: string, pattern: RegExp, type?: string, config?: import("../../typings/token").ParserConfig, accum?: import('../../typings/token').accum, acceptable?: import('../../typings/token').acceptable);
    /** @override */
    override cloneNode(): SyntaxToken;
    #private;
}
import Token = require(".");
