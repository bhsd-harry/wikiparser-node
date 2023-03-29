export = parseExternalLinks;
/**
 * 解析外部链接
 * @param {string} wikitext wikitext
 * @param {import('../../typings/token').accum} accum
 */
declare function parseExternalLinks(wikitext: string, config?: import("../../typings/token").ParserConfig, accum?: import('../../typings/token').accum): string;
