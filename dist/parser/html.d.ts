export = parseHtml;
/**
 * 解析HTML标签
 * @param {string} wikitext wikitext
 * @param {import('../../typings/token').accum} accum
 */
declare function parseHtml(wikitext: string, config?: import("../../typings/token").ParserConfig, accum?: import('../../typings/token').accum): string;
