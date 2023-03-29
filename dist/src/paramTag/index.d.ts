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
     */
    override toString(selector: any): string;
    /** @override */
    override text(): string;
    /** @override */
    override print(): string;
    /**
     * @override
     * @param {number} start 起始位置
     */
    override lint(start: number): any;
}
import Token = require("..");
