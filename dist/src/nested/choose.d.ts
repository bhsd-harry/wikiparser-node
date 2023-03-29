export = ChooseToken;
/**
 * `<choose>`
 * @classdesc `{childNodes: [...ExtToken|NoincludeToken]}`
 */
declare class ChooseToken extends NestedToken {
    /**
     * @param {string|undefined} wikitext wikitext
     * @param {import('../../../typings/token').accum} accum
     */
    constructor(wikitext: string | undefined, config?: import("../../../typings/token").ParserConfig, accum?: import('../../../typings/token').accum);
}
import NestedToken = require(".");
