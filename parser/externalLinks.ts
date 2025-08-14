import {zs, extUrlChar, extUrlCharFirst} from '../util/string';
import {ExtLinkToken} from '../src/extLink';
import {MagicLinkToken} from '../src/magicLink';
import type {Config} from '../base';
import type {Token} from '../internal';

/* NOT FOR BROWSER */

import {parsers} from '../util/constants';

/* NOT FOR BROWSER END */

/**
 * 解析外部链接
 * @param wikitext
 * @param config
 * @param accum
 * @param inFile 是否在图链中
 */
export const parseExternalLinks = (wikitext: string, config: Config, accum: Token[], inFile?: boolean): string => {
	// eslint-disable-next-line @typescript-eslint/no-unused-expressions
	/\[((?:\0\d+[cn]\x7F)*(?:\0\d+f\x7F|(?:(?:ftp:\/\/|\/\/)(?:\[[\da-f:.]+\]|[^[\]<>"\t\n\p{Zs}])|\0\d+m\x7F)[^[\]<>"\t\n\p{Zs}]*(?=[[\]<>"\t\p{Zs}]|\0\d)))(\p{Zs}*(?!\p{Zs}))([^\]\n]*)\]/giu;
	config.regexExternalLinks ??= new RegExp(
		String.raw`\[((?:\0\d+[cn]\x7F)*(?:\0\d+f\x7F|(?:(?:${config.protocol}|//)${extUrlCharFirst}|\0\d+m\x7F)${
			extUrlChar
		}(?=[[\]<>"\t${zs}]|\0\d)))([${zs}]*(?![${zs}]))([^\]\x01-\x08\x0A-\x1F\uFFFD]*)\]`,
		'giu',
	);
	return wikitext.replace(config.regexExternalLinks, (_, url: string, space: string, text: string) => {
		const {length} = accum,
			mt = /&[lg]t;/u.exec(url);
		if (mt) {
			space = '';
			text = url.slice(mt.index) + space + text;
			url = url.slice(0, mt.index);
		}
		if (inFile) {
			// @ts-expect-error abstract class
			new MagicLinkToken(url, 'ext-link-url', config, accum);
			return `[\0${length}f\x7F${space}${text}]`;
		}
		// @ts-expect-error abstract class
		new ExtLinkToken(url, space, text, config, accum);
		return `\0${length}w\x7F`;
	});
};

parsers['parseExternalLinks'] = __filename;
