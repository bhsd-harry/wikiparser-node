import type {AstNodes} from '../lib/node';

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
 * extract effective wikitext
 * @param childNodes a Token's contents
 * @param separator delimiter between nodes
 */
export const text = (childNodes: readonly (string | AstNodes)[], separator = ''): string =>
	childNodes.map(child => typeof child === 'string' ? child : child.text()).join(separator);

const names = {lt: '<', gt: '>', lbrack: '[', rbrack: ']', lbrace: '{', rbrace: '}'};

/** decode HTML entities */
export const decodeHtml = factory(
	/&(?:#(\d+|x[\da-fA-F]+)|([lLgG][tT]|[lr]brac[ke]));/gu,
	(_, code: string, name: string) => code
		? String.fromCodePoint(Number((/^x/iu.test(code) ? '0' : '') + code))
		: names[name.toLowerCase() as keyof typeof names],
);

/** escape newlines */
export const noWrap = factory(/\n/gu, String.raw`\n`);

const entities = {'&': 'amp', '<': 'lt', '>': 'gt'};

/** escape HTML entities */
export const escape = factory(/[&<>]/gu, p => `&${entities[p as keyof typeof entities]};`);

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
export const sanitize = factory(/[<>]/gu, p => `&${entities[p as keyof typeof entities]};`);

/**
 * convert to HTML
 * @param childNodes a Token's contents
 * @param separator delimiter between nodes
 */
export const html = (childNodes: readonly AstNodes[], separator = ''): string =>
	childNodes.map(child => child.toHtml()).join(separator);

/**
 * wrap text with <b> and <i> tags
 * @param node
 * @param str
 */
export const font = (node: AstNodes, str: string): string => {
	const {font: {bold, italic}} = node;
	return (bold ? '<b>' : '') + (italic ? '<i>' : '') + str + (italic ? '</i>' : '') + (bold ? '</b>' : '');
};
