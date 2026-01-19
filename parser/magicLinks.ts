import {zs, extUrlChar, extUrlCharFirst} from '../util/string';
import {MagicLinkToken} from '../src/magicLink';
import type {Config} from '../base';
import type {Token} from '../internal';

const space = String.raw`[${zs}\t]|&nbsp;|&#0*160;|&#x0*a0;`,
	sp = `(?:${space})+`,
	spdash = `(?:${space}|-)`,
	magicLinkPattern = String.raw`(?:RFC|PMID)${sp}\d+\b|ISBN${sp}(?:97[89]${spdash}?)?(?:\d${spdash}?){9}[\dx]\b`;

/**
 * 解析自由外链
 * @param wikitext
 * @param config
 * @param accum
 */
export const parseMagicLinks = (wikitext: string, config: Config, accum: Token[]): string => {
	if (!config.regexMagicLinks) {
		try {
			config.regexMagicLinks = new RegExp(
				String.raw`(^|[^\p{L}\p{N}_])(?:(?:${
					config.protocol
				})(${extUrlCharFirst}${extUrlChar})|${magicLinkPattern})`,
				'giu',
			);
		} catch /* istanbul ignore next */ {
			config.regexMagicLinks = new RegExp(
				String.raw`(^|\W)(?:(?:${config.protocol})(${extUrlCharFirst}${extUrlChar})|${magicLinkPattern})`,
				'giu',
			);
		}
	}
	return wikitext.replace(config.regexMagicLinks, (m, lead: string, p1: string | undefined) => {
		let url = lead ? m.slice(lead.length) : m;
		if (p1) {
			let trail = '';
			const m2 = /&(?:[lg]t|nbsp|#x0*(?:3[ce]|a0)|#0*(?:6[02]|160));/iu.exec(url);
			if (m2) {
				trail = url.slice(m2.index);
				url = url.slice(0, m2.index);
			}
			const sep = url.includes('(') ? /[^,;\\.:!?][,;\\.:!?]+$/u : /[^,;\\.:!?)][,;\\.:!?)]+$/u,
				sepChars = sep.exec(url);
			if (sepChars) {
				let correction = 1;
				if (
					sepChars[0][1] === ';'
					&& /&(?:[a-z]+|#x[\da-f]+|#\d+)$/iu.test(url.slice(0, sepChars.index))
				) {
					correction = 2;
				}
				trail = url.slice(sepChars.index + correction) + trail;
				url = url.slice(0, sepChars.index + correction);
			}
			if (trail.length >= p1.length) {
				return m;
			}
			// @ts-expect-error abstract class
			new MagicLinkToken(url, undefined, config, accum);
			return `${lead}\0${accum.length - 1}w\x7F${trail}`;
		} else if (!/^(?:RFC|PMID|ISBN)/u.test(url)) {
			return m;
		}
		// @ts-expect-error abstract class
		new MagicLinkToken(url, 'magic-link', config, accum);
		return `${lead}\0${accum.length - 1}i\x7F`;
	});
};
