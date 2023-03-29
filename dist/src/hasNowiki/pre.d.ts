export = PreToken;
/**
 * `<pre>`
 * @classdesc `{childNodes: [...AstText|NoincludeToken|ConverterToken]}`
 */
declare class PreToken extends HasNowikiToken {
    /**
     * @param {string} wikitext wikitext
     * @param {import('../../../typings/token').accum} accum
     */
    constructor(wikitext: string, config?: import("../../../typings/token").ParserConfig, accum?: import('../../../typings/token').accum);
}
import HasNowikiToken = require(".");
