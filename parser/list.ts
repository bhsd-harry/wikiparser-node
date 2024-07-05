import {parsers} from '../util/constants';
import {ListToken} from '../src/nowiki/list';
import {DdToken} from '../src/nowiki/dd';
import type {Config} from '../base';
import type {Token, HtmlToken, QuoteToken} from '../internal';

/**
 * 解析列表
 * @param wikitext
 * @param config
 * @param accum
 */
export const parseList = (wikitext: string, config: Config, accum: Token[]): string => {
	const mt = /^((?:\0\d+c\x7F)*)([;:*#]+\s*)/u.exec(wikitext) as [string, string, string] | null;
	if (!mt) {
		return wikitext;
	}
	const [total, comment, prefix] = mt,
		parts = prefix.split(/(?=;)/u);
	let text = comment + parts.map((_, i) => `\0${accum.length + i}d\x7F`).join('') + wikitext.slice(total.length),
		dt = parts.length - (parts[0]!.startsWith(';') ? 0 : 1);
	for (const part of parts) {
		// @ts-expect-error abstract class
		new ListToken(part, config, accum);
	}
	if (!dt) {
		return text;
	}
	const {html: [normalTags]} = config,
		fullRegex = /:+\s*|-\{|\0\d+[xq]\x7F/gu;
	let regex = fullRegex,
		ex = regex.exec(text),
		lt = 0,
		lb = false,
		li = false,
		lc = 0;

	/**
	 * 创建`DdToken`
	 * @param syntax `:`
	 * @param index 起点
	 */
	const dd = (syntax: string, index: number): string => {
		// @ts-expect-error abstract class
		new DdToken(syntax, config, accum);
		return `${text.slice(0, index)}\0${accum.length - 1}d\x7F${text.slice(index + syntax.length)}`;
	};

	/**
	 * 更新 `lt`
	 * @param closing 是否是闭合标签
	 */
	const update = (closing: boolean): void => {
		if (!closing) {
			lt++;
		} else if (lt) {
			lt--;
		}
	};
	while (ex && dt) {
		const {0: syntax, index} = ex;
		if (syntax === '-{') {
			if (!lc) {
				const {lastIndex} = regex;
				regex = /-\{|\}-/gu;
				regex.lastIndex = lastIndex;
			}
			lc++;
		} else if (syntax === '}-') {
			lc--;
			if (!lc) {
				const {lastIndex} = regex;
				regex = fullRegex;
				regex.lastIndex = lastIndex;
			}
		} else if (syntax.endsWith('x\x7F')) {
			const {name, closing, selfClosing} = accum[Number(syntax.slice(1, -2))] as HtmlToken;
			if (!selfClosing || normalTags.includes(name)) {
				update(closing);
			}
		} else if (syntax.endsWith('q\x7F')) {
			const {bold, italic} = accum[Number(syntax.slice(1, -2))] as QuoteToken;
			if (bold) {
				update(lb);
				lb = !lb;
			}
			if (italic) {
				update(li);
				li = !li;
			}
		} else if (lt === 0) { // syntax === ':'
			const trimmed = syntax.trim();
			if (trimmed.length >= dt) {
				return dd(syntax.slice(0, dt), index);
			}
			dt -= trimmed.length;
			regex.lastIndex = index + 4 + String(accum.length).length;
			text = dd(syntax, index);
		}
		ex = regex.exec(text);
	}
	return text;
};

parsers['parseList'] = __filename;
