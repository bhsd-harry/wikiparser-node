export = HasNowikiToken;
/**
 * `<pre>`
 * @classdesc `{childNodes: [...AstText|NoincludeToken]}`
 */
declare class HasNowikiToken extends Token {
    /**
     * @param {string} wikitext wikitext
     * @param {string} type type
     * @param {import('../../../typings/token').accum} accum
     */
    constructor(wikitext: string, type: string, config?: import("../../../typings/token").ParserConfig, accum?: import('../../../typings/token').accum);
}
import Token = require("..");
