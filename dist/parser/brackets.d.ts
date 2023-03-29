export = parseBrackets;
/**
 * 解析花括号
 * @param {string} text wikitext
 * @param {import('../../typings/token').accum} accum
 * @throws TranscludeToken.constructor()
 */
declare function parseBrackets(text: string, config?: import("../../typings/token").ParserConfig, accum?: import('../../typings/token').accum): string;
declare namespace parseBrackets {
    export { BracketExecArray };
}
type BracketExecArray = import('../../typings/parser').BracketExecArray;
