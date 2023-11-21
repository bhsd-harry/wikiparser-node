import * as Parser from '../index';
import {ListToken} from '../src/nowiki/list';
import {DdToken} from '../src/nowiki/dd';
import type {Token} from '../src/index';

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
	new ListToken(prefix, config, accum);
	if (!dt) {
		return text;
	}
	let regex = /:+|-\{/gu,
		ex = regex.exec(text),
		lc = 0;
	while (ex && dt) {
		const {0: syntax, index} = ex;
		if (syntax.startsWith(':')) {
			if (syntax.length >= dt) {
				new DdToken(':'.repeat(dt), config, accum);
				return `${text.slice(0, index)}\0${accum.length - 1}d\x7F${text.slice(index + dt)}`;
			}
			text = `${text.slice(0, index)}\0${accum.length}d\x7F${text.slice(regex.lastIndex)}`;
			dt -= syntax.length;
			regex.lastIndex = index + 4 + String(accum.length).length;
			new DdToken(syntax, config, accum);
		} else if (syntax === '-{') {
			if (!lc) {
				const {lastIndex} = regex;
				regex = /-\{|\}-/gu;
				regex.lastIndex = lastIndex;
			}
			lc++;
		} else {
			lc--;
			if (!lc) {
				const {lastIndex} = regex;
				regex = /:+|-\{/gu;
				regex.lastIndex = lastIndex;
			}
		}
		ex = regex.exec(text);
	}
	return text;
};
