import type {AstNodes} from '../lib/node';

export const extUrlCharFirst = '(?:\\[[\\da-f:.]+\\]|[^[\\]<>"\\0-\\x1F\\x7F\\p{Zs}\\uFFFD])';
export const extUrlChar = '(?:[^[\\]<>"\\0-\\x1F\\x7F\\p{Zs}\\uFFFD]|\\0\\d+[c!~]\\x7F)*';

/**
 * remove half-parsed comment-like tokens
 * @param str 原字符串
 */
export const removeComment = (str: string): string => str.replace(/\0\d+c\x7F/gu, '');

/**
 * escape special chars for RegExp constructor
 * @param str RegExp source
 */
export const escapeRegExp = (str: string): string => str.replace(/[\\{}()|.?*+^$[\]]/gu, '\\$&');

/**
 * extract effective wikitext
 * @param childNodes a Token's contents
 * @param separator delimiter between nodes
 */
export const text = (childNodes: (string | AstNodes)[], separator = ''): string =>
	childNodes.map(child => typeof child === 'string' ? child : child.text()).join(separator);

/**
 * decode HTML entities
 * @param str 原字符串
 */
export const decodeHtml = (str: string): string => str.replace(
	/&#(\d+|x[\da-f]+);/giu,
	(_, code: string) => String.fromCodePoint(Number(`${code[0]!.toLowerCase() === 'x' ? '0' : ''}${code}`)),
);

/**
 * escape newlines
 * @param str 原字符串
 */
export const noWrap = (str: string): string => str.replaceAll('\n', '\\n');

/**
 * 以HTML格式打印
 * @param childNodes 子节点
 * @param opt 选项
 */
export const print = (childNodes: AstNodes[], opt: PrintOpt = {}): string => {
	const {pre = '', post = '', sep = ''} = opt;
	return `${pre}${childNodes.map(child => child.print()).join(sep)}${post}`;
};

/* NOT FOR BROWSER */

/**
 * convert newline in text nodes to single whitespace
 * @param token 父节点
 */
export const normalizeSpace = (token?: AstNodes): void => {
	if (token) {
		for (const child of token.childNodes) {
			if (child.type === 'text') {
				child.replaceData(child.data.replaceAll('\n', ' '));
			}
		}
	}
};
