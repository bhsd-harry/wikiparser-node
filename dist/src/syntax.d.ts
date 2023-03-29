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
     */
    constructor(wikitext: string, pattern: RegExp, type?: string, config?: import("../../typings/token").ParserConfig, accum?: import('../../typings/token').accum, acceptable?: any);
}
import Token = require(".");
