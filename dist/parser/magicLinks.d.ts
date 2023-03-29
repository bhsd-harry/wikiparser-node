export = parseMagicLinks;
/**
 * 解析自由外链
 * @param {string} wikitext wikitext
 * @param {import('../../typings/token').accum} accum
 */
declare function parseMagicLinks(wikitext: string, config?: import("../../typings/token").ParserConfig, accum?: import('../../typings/token').accum): string;
