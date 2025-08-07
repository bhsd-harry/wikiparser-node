import type {AstNodes} from '../lib/node';

export {rawurldecode} from '@bhsd/common';

/**
 * trim and toLowerCase
 * @param s 字符串
 */
export const trimLc = (s: string): string => s.trim().toLowerCase();

/**
 * 恢复原始字符串
 * @param s 更改后的字符串
 * @param stack 原始字符串片段
 */
export function restore(s: string, stack: string[]): string {
	// eslint-disable-next-line @typescript-eslint/non-nullable-type-assertion-style
	return s.replace(/\0(\d+)\x7F/gu, (_, p1: number) => stack[p1] as string);
}

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

/**
 * extract effective wikitext
 * @param childNodes a Token's contents
 * @param separator delimiter between nodes
 */
export const text = (childNodes: readonly (string | AstNodes)[], separator = ''): string =>
	childNodes.map(child => typeof child === 'string' ? child : child.text()).join(separator);

const names = {lt: '<', gt: '>', lbrack: '[', rbrack: ']', lbrace: '{', rbrace: '}', nbsp: ' ', amp: '&', quot: '"'};

/** decode HTML entities */
export const decodeHtmlBasic = factory(
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
