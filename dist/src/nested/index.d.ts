export = NestedToken;
/**
 * 嵌套式的扩展标签
 * @classdesc `{childNodes: [...ExtToken|NoincludeToken|CommentToken]}`
 */
declare class NestedToken extends Token {
    /**
     * @param {string|undefined} wikitext wikitext
     * @param {RegExp} regex 内层正则
     * @param {string[]} tags 内层标签名
     * @param {import('../../../typings/token').accum} accum
     */
    constructor(wikitext: string | undefined, regex: RegExp, tags: string[], config?: import("../../../typings/token").ParserConfig, accum?: import('../../../typings/token').accum);
    /**
     * @override
     * @param {number} start 起始位置
     */
    override lint(start: number): any;
}
import Token = require("..");
