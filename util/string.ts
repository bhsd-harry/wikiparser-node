import type {AstNodes, Token} from '../internal';

export const zs = String.raw` \xA0\u1680\u2000-\u200A\u202F\u205F\u3000`;
const commonExtUrlChar = String.raw`[^[\]<>"\0-\x1F\x7F${zs}\uFFFD]`;
export const extUrlCharFirst = String.raw`(?:\[[\da-f:.]+\]|${commonExtUrlChar})`;
export const extUrlChar = String.raw`(?:${commonExtUrlChar}|\0\d+[cn!~]\x7F)*`;

/**
 * trim and toLowerCase
 * @param s 字符串
 */
export const trimLc = (s: string): string => s.trim().toLowerCase();

/**
 * 恢复原始字符串
 * @param s 更改后的字符串
 * @param stack 原始字符串片段
 * @param translate 是否恢复`<translate>`或`<tvar>`标签
 */
export function restore(s: string, stack: Token[], translate: 1 | 2): string;
export function restore(s: string, stack: string[]): string;
export function restore(s: string, stack: string[] | Token[], translate?: 1 | 2): string {
	if (translate === 1) {
		return s.replace(
			/\0(\d+)g\x7F/gu,
			(_, p1: number) => restore(String(stack[p1]), stack as Token[], 2),
		);
	} else if (translate === 2) {
		return s.replace(/\0(\d+)n\x7F/gu, (_, p1: number) => String(stack[p1]));
	}
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
export const decodeHtml = (str: string): string => {
	/* NOT FOR BROWSER ONLY */

	// eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
	if (typeof process === 'object' && typeof process.versions?.node === 'string') {
		try {
			const {decodeHTMLStrict}: typeof import('entities') = require('entities');
			return decodeHTMLStrict(str).replace(/\xA0/gu, ' ');
		} catch {}
	}
	/* istanbul ignore next */

	/* NOT FOR BROWSER ONLY END */

	return decodeHtmlBasic(str);
};

/** decode numbered HTML entities */
export const decodeNumber = factory(
	/&#(\d+|x[\da-f]+);/giu,
	(_, code: string) => String.fromCodePoint(Number((/^x/iu.test(code) ? '0' : '') + code)),
);
