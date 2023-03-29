export = parseList;
/**
 * 解析列表
 * @param {string} text wikitext
 * @param {import('../../typings/token').accum} accum
 */
declare function parseList(text: string, config?: import("../../typings/token").ParserConfig, accum?: import('../../typings/token').accum): string;
