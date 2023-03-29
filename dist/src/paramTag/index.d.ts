export = ParamTagToken;
/**
 * `<inputbox>`
 * @classdesc `{childNodes: ...AtomToken}`
 */
declare class ParamTagToken extends Token {
    /**
     * @param {string} wikitext wikitext
     * @param {import('../../../typings/token').accum} accum
     */
    constructor(wikitext: string, config?: import("../../../typings/token").ParserConfig, accum?: import('../../../typings/token').accum);
    /**
     * @override
     * @param {string} selector
     */
    override toString(selector: string): string;
    /** @override */
    override text(): string;
    /** @override */
    override print(): string;
    /**
     * @override
     * @this {ParamTagToken & {constructor: typeof ParamTagToken}}
     */
    override cloneNode(this: ParamTagToken & {
        constructor: typeof ParamTagToken;
    }): ParamTagToken;
}
import Token = require("..");
