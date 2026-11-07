import {zs, extUrlChar, extUrlCharFirst} from '../util/string';
import {safePatternReplace} from '../util/replace';
import {ExtLinkToken} from '../src/extLink';
import {MagicLinkToken} from '../src/magicLink';
import type {Config} from '../base';
import type {Token} from '../internal';

/**
 * 解析外部链接
 * @param wikitext
 * @param config
 * @param accum
 * @param inFile 是否在图链中
 */
export const parseExternalLinks = (wikitext: string, config: Config, accum: Token[], inFile?: boolean): string => {
	config.regexExternalLinks ??= new RegExp(
		String.raw`\[((?:\0\d+[cn]\x7F)*(?:\0\d+f\x7F|(?:(?:${config.protocol}|//)${extUrlCharFirst}|\0\d+m\x7F)${
			extUrlChar
		}(?=[[\]<>"\t${zs}]|\0\d)))([${zs}]*(?![${zs}]))`,
		'giu',
	);
	const re = config.regexExternalLinks;
	return safePatternReplace(wikitext, re, ']', (text, [, url, space]) => {
		if (/[\x01-\x08\x0A-\x1F\uFFFD]/u.test(text)) {
			return false;
		}
		const {length} = accum,
			i = url!.search(/&[lg]t;/u);
		if (i !== -1) {
			space = '';
			text = url!.slice(i) + space + text;
			url = url!.slice(0, i);
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
