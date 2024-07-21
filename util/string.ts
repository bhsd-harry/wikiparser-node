import type {AstNodes} from '../lib/node';

const commonExtUrlChar = String.raw`[^[\]<>"\0-\x1F\x7F\p{Zs}\uFFFD]`;
export const extUrlCharFirst = String.raw`(?:\[[\da-f:.]+\]|${commonExtUrlChar})`;
export const extUrlChar = String.raw`(?:${commonExtUrlChar}|\0\d+[cn!~]\x7F)*`;

/**
 * 生成正则替换函数
 * @param regex 正则表达式
 * @param replace 替换字符串或函数
 */
const factory = (
	regex: RegExp,
	replace: string | ((str: string, ...args: any[]) => string),
) => (str: string): string => str.replace(regex, replace as string);

/** 清理解析专用的不可见字符 */
export const tidy = factory(/[\0\x7F]|\r$/gmu, '');

/** remove half-parsed comment-like tokens */
export const removeComment = factory(/\0\d+[cn]\x7F/gu, '');

/** escape special chars for RegExp constructor */
export const escapeRegExp = factory(/[\\{}()|.?*+^$[\]]/gu, String.raw`\$&`);

/**
 * PHP的`rawurldecode`函数的JavaScript实现
 * @param str 要解码的字符串
 */
export const rawurldecode = (str: string): string => decodeURIComponent(str.replace(/%(?![\da-f]{2})/giu, '%25'));

/**
 * extract effective wikitext
 * @param childNodes a Token's contents
 * @param separator delimiter between nodes
 */
export const text = (childNodes: readonly (string | AstNodes)[], separator = ''): string =>
	childNodes.map(child => typeof child === 'string' ? child : child.text()).join(separator);

const names = {lt: '<', gt: '>', lbrack: '[', rbrack: ']', lbrace: '{', rbrace: '}', nbsp: ' ', amp: '&'};

/** decode HTML entities */
export const decodeHtml = factory(
	/&(?:#(\d+|[Xx][\da-fA-F]+)|([lLgG][tT]|[lr]brac[ke]|nbsp|amp|AMP));/gu,
	(_, code: string, name: string) => code
		? String.fromCodePoint(Number((/^x/iu.test(code) ? '0' : '') + code))
		: names[name.toLowerCase() as keyof typeof names],
);

/** escape newlines */
export const noWrap = factory(/\n/gu, String.raw`\n`);
