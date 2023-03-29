export = ExtToken;
/**
 * 扩展标签
 * @classdesc `{childNodes: [AttributesToken, NowikiToken|Token]}`
 */
declare class ExtToken extends TagPairToken {
    /**
     * @param {string} name 标签名
     * @param {string} attr 标签属性
     * @param {string} inner 内部wikitext
     * @param {string|undefined} closed 是否封闭
     * @param {import('../../../typings/token').accum} accum
     */
    constructor(name: string, attr?: string, inner?: string, closed?: string | undefined, config?: import("../../../typings/token").ParserConfig, accum?: import('../../../typings/token').accum);
    closed: boolean;
}
import TagPairToken = require(".");
