export = parseHrAndDoubleUnderscore;
/**
 * 解析\<hr\>和状态开关
 * @param {Token & {firstChild: AstText}} root 根节点
 * @param {import('../../typings/token').accum} accum
 */
declare function parseHrAndDoubleUnderscore({ firstChild: { data }, type, name }: Token & {
    firstChild: AstText;
}, config?: import("../../typings/token").ParserConfig, accum?: import('../../typings/token').accum): string;
import Token = require("../src");
import AstText = require("../lib/text");
