import type {AstNodes} from '../lib/node';
import type {Token} from '../internal';

const commonExtUrlChar = String.raw`[^[\]<>"\0-\x1F\x7F\p{Zs}\uFFFD]`;
export const extUrlCharFirst = String.raw`(?:\[[\da-f:.]+\]|${commonExtUrlChar})`;
export const extUrlChar = String.raw`(?:${commonExtUrlChar}|\0\d+[c!~]\x7F)*`;

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
export const removeComment = factory(/\0\d+c\x7F/gu, '');

/** escape special chars for RegExp constructor */
export const escapeRegExp = factory(/[\\{}()|.?*+^$[\]]/gu, String.raw`\$&`);

/**
 * PHP的`rawurldecode`函数的JavaScript实现
 * @param str 要解码的字符串
 */
export const rawurldecode = (str: string): string => decodeURIComponent(str.replace(/%(?![\da-f]{2})/giu, '%25'));

/** PHP的`trim`函数的JavaScript实现 */
export const trimPHP = factory(/^[ \t\n\0\v]+|([^ \t\n\0\v])[ \t\n\0\v]+$/gu, '$1');

/**
 * extract effective wikitext
 * @param childNodes a Token's contents
 * @param separator delimiter between nodes
 */
export const text = (childNodes: readonly (string | AstNodes)[], separator = ''): string =>
	childNodes.map(child => typeof child === 'string' ? child : child.text()).join(separator);

const names = {lt: '<', gt: '>', lbrack: '[', rbrack: ']', lbrace: '{', rbrace: '}', nbsp: ' '};

/** decode HTML entities */
export const decodeHtml = factory(
	/&(?:#(\d+|x[\da-fA-F]+)|([lLgG][tT]|[lr]brac[ke]|nbsp));/gu,
	(_, code: string, name: string) => code
		? String.fromCodePoint(Number((/^x/iu.test(code) ? '0' : '') + code))
		: names[name.toLowerCase() as keyof typeof names],
);

/** escape newlines */
export const noWrap = factory(/\n/gu, String.raw`\n`);

const entities = {'&': 'amp', '<': 'lt', '>': 'gt', '"': 'quot', '\n': '#10'};

/**
 * replace by HTML entities
 * @param re regex
 */
const replaceEntities = (re: RegExp): (str: string) => string =>
	factory(re, p => `&${entities[p as keyof typeof entities]};`);

/** escape HTML entities */
export const escape = replaceEntities(/[&<>]/gu);

/**
 * 以HTML格式打印
 * @param childNodes 子节点
 * @param opt 选项
 */
export const print = (childNodes: readonly AstNodes[], opt: PrintOpt = {}): string => {
	const {pre = '', post = '', sep = ''} = opt;
	return pre + childNodes.map(child => child.print()).join(sep) + post;
};

/* NOT FOR BROWSER */

/** encode URI */
export const encode = factory(/[<>[\]#|=]+/gu, encodeURIComponent);

/**
 * convert newline in text nodes to single whitespace
 * @param token 父节点
 */
export const normalizeSpace = (token: AstNodes | undefined): void => {
	if (token) {
		for (const child of token.childNodes) {
			if (child.type === 'text') {
				child.replaceData(child.data.replace(/\n+/gu, ' '));
			}
		}
	}
};

/** escape HTML entities */
export const sanitize = replaceEntities(/[<>]/gu);

/** escape HTML entities in attributes */
export const sanitizeAttr = replaceEntities(/[<>"\n]/gu);

/**
 * sanitize selected HTML attributes
 * @param str attribute value
 */
export const sanitizeAlt = (str: string | undefined): string | undefined =>
	str?.replace(/<\/?[a-z].*?>/gu, '').trim().replace(/\s+/gu, ' ').replaceAll('"', '&quot;');

/** escape newline */
export const newline = factory(/\n/gu, '&#10;');

/**
 * remove lines that only contain comments
 * @param str
 * @param accum
 * @param standalone whether for a standalone document
 */
export const removeCommentLine = (str: string, accum: Token[], standalone?: boolean): string => {
	const lines = str.split('\n'),
		offset = standalone ? 0 : 1;
	for (let i = lines.length - 1 - offset; i >= offset; i--) {
		const line = lines[i]!;
		if (
			/^(?:\s|\0\d+c\x7F)*$/u.test(line)
			&& line.match(/\0\d+c\x7F/gu)?.every(s => accum[Number(s.slice(1, -2))]?.type === 'comment')
		) {
			lines.splice(i, 1);
		}
	}
	return removeComment(lines.join('\n'));
};
