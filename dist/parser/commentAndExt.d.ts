export = parseCommentAndExt;
/**
 * 解析HTML注释和扩展标签
 * @param {string} text wikitext
 * @param {import('../../typings/token').accum} accum
 * @param {boolean} includeOnly 是否嵌入
 */
declare function parseCommentAndExt(text: string, config?: import("../../typings/token").ParserConfig, accum?: import('../../typings/token').accum, includeOnly?: boolean): string;
