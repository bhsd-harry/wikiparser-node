export = AtomToken;
/**
 * 不会被继续解析的plain Token
 * @classdesc `{childNodes: ...AstText|Token}`
 */
declare class AtomToken extends Token {
    /**
     * @param {string} wikitext wikitext
     * @param {string|undefined} type Token.type
     * @param {import('../../../typings/token').accum} accum
     */
    constructor(wikitext: string, type: string | undefined, config?: import("../../../typings/token").ParserConfig, accum?: import('../../../typings/token').accum, acceptable?: any);
}
import Token = require("..");
