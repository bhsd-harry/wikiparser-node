import {extUrlChar, extUrlCharFirst} from '../util/string';
import {Shadow} from '../util/debug';
import * as Parser from '../index';
import {ExtLinkToken} from '../src/extLink';
import type {Token} from '../src/index';

/**
 * 解析外部链接
 * @param wikitext
 * @param config
 * @param accum
 */
export const parseExternalLinks = (wikitext: string, config = Parser.getConfig(), accum: Token[] = []): string => {
	const regex = new RegExp(
		`\\[((?:(?:${config.protocol}|//)${extUrlCharFirst}|\0\\d+m\x7F)${
			extUrlChar
		})(\\p{Zs}*)([^\\]\x01-\x08\x0A-\x1F\uFFFD]*)\\]`,
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
		new ExtLinkToken(url, space, text, config, accum);
		return `\0${length}w\x7F`;
	});
};

Shadow.parsers['parseExternalLinks'] = __filename;
