export = parseQuotes;
/**
 * 解析单引号
 * @param {string} text wikitext
 * @param {import('../../typings/token').accum} accum
 */
declare function parseQuotes(text: string, config?: import("../../typings/token").ParserConfig, accum?: import('../../typings/token').accum): string;
