import type {AstNodes} from '../lib/node';

export {rawurldecode} from '@bhsd/common';

export const zs = String.raw` \xA0\u1680\u2000-\u200A\u202F\u205F\u3000`;
const commonExtUrlChar = String.raw`[^[\]<>"\0-\x1F\x7F${zs}\uFFFD]`;
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
 * extract effective wikitext
 * @param childNodes a Token's contents
 * @param separator delimiter between nodes
 */
export const text = (childNodes: readonly (string | AstNodes)[], separator = ''): string =>
	childNodes.map(child => typeof child === 'string' ? child : child.text()).join(separator);

const names = {lt: '<', gt: '>', lbrack: '[', rbrack: ']', lbrace: '{', rbrace: '}', nbsp: ' ', amp: '&', quot: '"'};

/* istanbul ignore next */
/** decode HTML entities */
const decodeHtmlBasic = factory(
	/&(?:#(\d+|[Xx][\da-fA-F]+)|([lg]t|[LG]T|[lr]brac[ke]|nbsp|amp|AMP|quot|QUOT));/gu,
	(_, code: string, name: string) => code
		? String.fromCodePoint(Number((/^x/iu.test(code) ? '0' : '') + code))
		: names[name.toLowerCase() as keyof typeof names],
);

/**
 * decode HTML entities
 * @param str
 */
// eslint-disable-next-line arrow-body-style
export const decodeHtml = (str: string): string => {
	return decodeHtmlBasic(str);
};

/** decode numbered HTML entities */
export const decodeNumber = factory(
	/&#(\d+|x[\da-f]+);/giu,
	(_, code: string) => String.fromCodePoint(Number((/^x/iu.test(code) ? '0' : '') + code)),
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
