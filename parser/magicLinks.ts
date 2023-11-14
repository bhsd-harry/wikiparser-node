import {extUrlChar, extUrlCharFirst} from '../util/string';
import Parser from '../index';
import {MagicLinkToken} from '../src/magicLink';
import type {Token} from '../src';

/**
 * 解析自由外链
 * @param wikitext
 * @param config
 * @param accum
 */
export const parseMagicLinks = (wikitext: string, config = Parser.getConfig(), accum: Token[] = []): string => {
	const regex = new RegExp(`(^|[^\\p{L}\\d_])(?:${config.protocol})(${extUrlCharFirst}${extUrlChar})`, 'giu');
	return wikitext.replace(regex, (m, lead: string, p1: string) => {
		let trail = '',
			url = lead ? m.slice(1) : m;
		const m2 = /&(?:lt|gt|nbsp|#x0*(?:3[ce]|a0)|#0*(?:6[02]|160));/iu.exec(url);
		if (m2) {
			trail = url.slice(m2.index);
			url = url.slice(0, m2.index);
		}
		const sep = new RegExp(`[,;.:!?${url.includes('(') ? '' : ')'}]+$`, 'u'),
			sepChars = sep.exec(url);
		if (sepChars) {
			let correction = 0;
			if (sepChars[0]!.startsWith(';') && /&(?:[a-z]+|#x[\da-f]+|#\d+)$/iu.test(url.slice(0, sepChars.index))) {
				correction = 1;
			}
			trail = `${url.slice(sepChars.index + correction)}${trail}`;
			url = url.slice(0, sepChars.index + correction);
		}
		if (trail.length >= p1.length) {
			return m;
		}
		new MagicLinkToken(url, false, config, accum);
		return `${lead}\0${accum.length - 1}w\x7F${trail}`;
	});
};
