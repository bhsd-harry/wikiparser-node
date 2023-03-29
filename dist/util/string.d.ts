export const extUrlCharFirst: "(?:\\[[\\da-f:.]+\\]|[^[\\]<>\"\\0-\\x1F\\x7F\\p{Zs}\\uFFFD])";
export const extUrlChar: "(?:[^[\\]<>\"\\0-\\x1F\\x7F\\p{Zs}\\uFFFD]|\\0\\d+c\\x7F)*";
/**
 * remove half-parsed comment-like tokens
 * @param {string} str 原字符串
 */
export function removeComment(str: string): string;
/**
 * 以HTML格式打印
 * @param {(AstText|AstElement)[]} childNodes 子节点
 * @param {printOpt} opt 选项
 */
export function print(childNodes: (import("../lib/text") | import("../lib/element"))[], opt?: printOpt): string;
/**
 * escape special chars for RegExp constructor
 * @param {string} str RegExp source
 */
export function escapeRegExp(str: string): string;
/**
 * a more sophisticated string-explode function
 * @param {string} start start syntax of a nested AST node
 * @param {string} end end syntax of a nested AST node
 * @param {string} separator syntax for explosion
 * @param {string} str string to be exploded
 */
export function explode(start: string, end: string, separator: string, str: string): string[];
/**
 * extract effective wikitext
 * @param {(string|AstNode)[]} childNodes a Token's contents
 * @param {string} separator delimiter between nodes
 */
export function text(childNodes: (string | import("../lib/node"))[], separator?: string): string;
/**
 * decode HTML entities
 * @param {string} str 原字符串
 */
export function decodeHtml(str: string): string;
