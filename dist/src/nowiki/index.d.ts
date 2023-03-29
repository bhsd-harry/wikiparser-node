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
     * @this {NowikiToken & {firstChild: AstText, constructor: typeof NowikiToken}}
     */
    override cloneNode(this: NowikiToken & {
        firstChild: AstText;
        constructor: typeof NowikiToken;
    }): NowikiToken;
    /**
     * @override
     * @param {string} str 新文本
     */
    override setText(str: string): string;
}
import Token = require("..");
import AstText = require("../../lib/text");
