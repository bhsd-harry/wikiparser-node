import {extUrlChar, extUrlCharFirst} from '../util/string';
import Parser from '../index';
import {ExtLinkToken} from '../src/extLink';
import type {Token} from '../src/index';

/**
 * 解析外部链接
 * @param wikitext
 * @param config
 * @param accum
 */
export const parseExternalLinks = (wikitext: string, config = Parser.getConfig(), accum: Token[] = []): string => {
	// eslint-disable-next-line @typescript-eslint/no-unused-expressions
	/\[((?:\[[\da-f:.]+\]|[^[\]\t\n\p{Zs}])[^[\]\t\n\p{Zs}]*(?=[[\]\t\p{Zs}]|\0\d))(\p{Zs}*(?=\P{Zs}))([^\]\n]*)\]/giu;
	const regex = new RegExp(
		`\\[((?:(?:${config.protocol}|//)${extUrlCharFirst}|\0\\d+m\x7F)${extUrlChar}(?=[[\\]<>"\\t\\p{Zs}]|\0\\d))`
		+ '(\\p{Zs}*(?=\\P{Zs}))([^\\]\x01-\x08\x0A-\x1F\uFFFD]*)\\]',
		'giu',
	);
	return wikitext.replace(regex, (_, url: string, space: string, text: string) => {
		const {length} = accum,
			mt = /&[lg]t;/u.exec(url);
		if (mt) {
			url = url.slice(0, mt.index);
			space = '';
			text = `${url.slice(mt.index)}${space}${text}`;
		}
		// @ts-expect-error abstract class
		new ExtLinkToken(url, space, text, config, accum);
		return `\0${length}w\x7F`;
	});
};
