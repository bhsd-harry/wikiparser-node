import {extUrlChar, extUrlCharFirst} from '../util/string';
import {MagicLinkToken} from '../src/magicLink';
import type {Config} from '../base';
import type {Token} from '../src/index';

const sepRegex = /[^,;\\.:!?)][,;\\.:!?)]+$/u,
	sepLparRegex = /[^,;\\.:!?][,;\\.:!?]+$/u;

/**
 * 解析自由外链
 * @param wikitext
 * @param config
 * @param accum
 */
export const parseMagicLinks = (wikitext: string, config: Config, accum: Token[]): string => {
	const space = '[\\p{Zs}\t]|&nbsp;|&#0*160;|&#x0*a0;',
		spdash = `(?:${space}|-)`,
		regex = new RegExp(
			'(^|[^\\p{L}\\d_])' // lead
			+ '(?:'
			+ `(?:${config.protocol})(${extUrlCharFirst}${extUrlChar})` // free external link
			+ '|'
			+ `(?:RFC|PMID)(?:${space})+\\d+\\b` // RFC or PMID
			+ '|'
			+ `ISBN(?:${space})+(?:97[89]${spdash}?)?(?:\\d${spdash}?){9}[\\dx]\\b` // ISBN
			+ ')',
			'giu',
		);
	return wikitext.replace(regex, (m, lead: string, p1: string | undefined) => {
		let url = lead ? m.slice(lead.length) : m;
		if (p1) {
			let trail = '';
			const m2 = /&(?:lt|gt|nbsp|#x0*(?:3[ce]|a0)|#0*(?:6[02]|160));/iu.exec(url);
			if (m2) {
				trail = url.slice(m2.index);
				url = url.slice(0, m2.index);
			}
			const sep = url.includes('(') ? sepLparRegex : sepRegex,
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
