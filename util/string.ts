import type {AstNodes} from '../lib/node';

export const extUrlCharFirst = '(?:\\[[\\da-f:.]+\\]|[^[\\]<>"\\0-\\x1F\\x7F\\p{Zs}\\uFFFD])';
export const extUrlChar = '(?:[^[\\]<>"\\0-\\x1F\\x7F\\p{Zs}\\uFFFD]|\\0\\d+[c!~]\\x7F)*';

/**
 * 生成正则替换函数
 * @param regex 正则表达式
 * @param replace 替换字符串或函数
 */
const factory = (
	regex: RegExp,
	replace: string | ((str: string, ...args: any[]) => string),
) => (str: string): string => str.replace(regex, replace as string);

/** remove half-parsed comment-like tokens */
export const removeComment = factory(/\0\d+c\x7F/gu, '');

/** escape special chars for RegExp constructor */
export const escapeRegExp = factory(/[\\{}()|.?*+^$[\]]/gu, '\\$&');

/**
 * extract effective wikitext
 * @param childNodes a Token's contents
 * @param separator delimiter between nodes
 */
export const text = (childNodes: readonly (string | AstNodes)[], separator = ''): string =>
	childNodes.map(child => typeof child === 'string' ? child : child.text()).join(separator);

/** decode HTML entities */
export const decodeHtml = factory(
	/&#(\d+|x[\da-f]+);/giu,
	(_, code: string) => String.fromCodePoint(Number(`${code.toLowerCase().startsWith('x') ? '0' : ''}${code}`)),
);

/**
 * escape newlines
 * @param str 原字符串
 */
export const noWrap = factory(/\n/gu, '\\n');

/**
 * 以HTML格式打印
 * @param childNodes 子节点
 * @param opt 选项
 */
export const print = (childNodes: readonly AstNodes[], opt: PrintOpt = {}): string => {
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
				child.replaceData(child.data.replace(/\n+/gu, ' '));
			}
		}
	}
};
