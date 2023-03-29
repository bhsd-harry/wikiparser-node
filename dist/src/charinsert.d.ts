export = CharinsertToken;
/**
 * `<charinsert>`
 * @classdesc `{childNodes: [...HasNowikiToken]}`
 */
declare class CharinsertToken extends Token {
    /**
     * @param {string} wikitext wikitext
     * @param {import('../../typings/token').accum} accum
     */
    constructor(wikitext: string, config?: import("../../typings/token").ParserConfig, accum?: import('../../typings/token').accum);
    /**
     * @override
     * @param {string} selector
     */
    override toString(selector: string): string;
    /** @override */
    override print(): string;
    /** @override */
    override cloneNode(): CharinsertToken;
    /**
     * 获取某一行的插入选项
     * @param {number|HasNowikiToken} child 行号或子节点
     */
    getLineItems(child: number | HasNowikiToken): (string | string[])[];
    /** 获取所有插入选项 */
    getAllItems(): (string | string[])[];
    /** @override */
    override text(): string;
}
import Token = require(".");
import HasNowikiToken = require("./hasNowiki");
