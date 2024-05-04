import {extUrlChar, extUrlCharFirst} from '../util/string';
import {ExtLinkToken} from '../src/extLink';
import {MagicLinkToken} from '../src/magicLink';
import type {Config} from '../base';
import type {Token} from '../src/index';

/**
 * 解析外部链接
 * @param wikitext
 * @param config
 * @param accum
 * @param inFile 是否在图链中
 */
export const parseExternalLinks = (wikitext: string, config: Config, accum: Token[], inFile?: boolean): string => {
	// eslint-disable-next-line @typescript-eslint/no-unused-expressions
	/\[((?:\[[\da-f:.]+\]|[^[\]\t\n\p{Zs}])[^[\]\t\n\p{Zs}]*(?=[[\]\t\p{Zs}]|\0\d))(\p{Zs}*(?=\P{Zs}))([^\]\n]*)\]/giu;
	const regex = new RegExp(
		'\\[' // 左括号
		+ `(${
			'\0\\d+f\x7F' // 预先解析的MagicLinkToken
			+ '|'
			+ `(?:(?:${config.protocol}|//)${extUrlCharFirst}|\0\\d+m\x7F)${extUrlChar}(?=[[\\]<>"\\t\\p{Zs}]|\0\\d)`
		})` // 链接网址
		+ '(\\p{Zs}*(?=\\P{Zs}))' // 空格
		+ '([^\\]\x01-\x08\x0A-\x1F\uFFFD]*)' // 链接文字
		+ '\\]', // 右括号
		'giu',
	);
	return wikitext.replace(regex, (_, url: string, space: string, text: string) => {
		const {length} = accum,
			mt = /&[lg]t;/u.exec(url);
		if (mt) {
			url = url.slice(0, mt.index);
			space = '';
			text = url.slice(mt.index) + space + text;
		}
		if (inFile) {
			// @ts-expect-error abstract class
			new MagicLinkToken(url, true, config, accum);
			return `[\0${length}f\x7F${space}${text}]`;
		}
		// @ts-expect-error abstract class
		new ExtLinkToken(url, space, text, config, accum);
		return `\0${length}w\x7F`;
	});
};
