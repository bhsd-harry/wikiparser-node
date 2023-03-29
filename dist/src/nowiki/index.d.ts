export = NowikiToken;
/**
 * 纯文字Token，不会被解析
 * @classdesc `{childNodes: [AstText]}`
 */
declare class NowikiToken extends Token {
    /**
     * @param {string} wikitext wikitext
     * @param {import('../../../typings/token').accum} accum
     */
    constructor(wikitext: string, config?: import("../../../typings/token").ParserConfig, accum?: import('../../../typings/token').accum);
    /**
     * @override
     * @param {number} start 起始位置
     */
    override lint(start?: number): any;
}
import Token = require("..");
