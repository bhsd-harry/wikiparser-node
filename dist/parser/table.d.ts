export = parseTable;
/**
 * 解析表格，注意`tr`和`td`包含开头的换行
 * @param {Token & {firstChild: AstText}} root 根节点
 * @param {import('../../typings/token').accum} accum
 */
declare function parseTable({ firstChild: { data }, type, name }: Token & {
    firstChild: AstText;
}, config?: import("../../typings/token").ParserConfig, accum?: import('../../typings/token').accum): string;
import Token = require("../src");
import AstText = require("../lib/text");
