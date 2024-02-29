import {parsers} from '../util/constants';
import Parser from '../index';
import {ListToken} from '../src/nowiki/list';
import {DdToken} from '../src/nowiki/dd';
import type {Token, HtmlToken} from '../internal';

/**
 * 解析列表
 * @param wikitext
 * @param config
 * @param accum
 */
export const parseList = (wikitext: string, config = Parser.getConfig(), accum: Token[] = []): string => {
	const mt = /^((?:\0\d+c\x7F)*)([;:*#]+)/u.exec(wikitext) as [string, string, string] | null;
	if (!mt) {
		return wikitext;
	}
	const [total, comment, prefix] = mt;
	let text = `${comment}\0${accum.length}d\x7F${wikitext.slice(total.length)}`,
		dt = prefix.split(';').length - 1;
	// @ts-expect-error abstract class
	new ListToken(prefix, config, accum);
	if (!dt) {
		return text;
	}
	const {html: [normalTags]} = config,
		fullRegex = /:+|-\{|\0\d+x\x7F/gu;
	let regex = fullRegex,
		ex = regex.exec(text),
		lt = 0,
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
		} else if (syntax.startsWith('\0')) {
			const {name, closing, selfClosing} = accum[Number(syntax.slice(1, -2))] as HtmlToken;
			if (!selfClosing || normalTags.includes(name)) {
				if (!closing) {
					lt++;
				} else if (lt) {
					lt--;
				}
			}
		} else if (lt === 0) { // syntax === ':'
			if (syntax.length >= dt) {
				return dd(syntax.slice(0, dt), index);
			}
			dt -= syntax.length;
			regex.lastIndex = index + 4 + String(accum.length).length;
			text = dd(syntax, index);
		}
		ex = regex.exec(text);
	}
	return text;
};

parsers['parseList'] = __filename;
