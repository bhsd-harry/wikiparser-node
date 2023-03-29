export = parseLinks;
/**
 * 解析内部链接
 * @param {string} wikitext wikitext
 * @param {import('../../typings/token').accum} accum
 */
declare function parseLinks(wikitext: string, config?: import("../../typings/token").ParserConfig, accum?: import('../../typings/token').accum): string;
