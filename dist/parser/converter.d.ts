export = parseConverter;
/**
 * 解析语言变体转换
 * @param {string} wikitext wikitext
 * @param {import('../../typings/token').accum} accum
 */
declare function parseConverter(wikitext: string, config?: import("../../typings/token").ParserConfig, accum?: import('../../typings/token').accum): string;
