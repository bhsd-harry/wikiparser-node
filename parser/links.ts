import Parser from '../index';
import {parseQuotes} from './quotes';
import {parseExternalLinks} from './externalLinks';
import {LinkToken} from '../src/link/index';
import {FileToken} from '../src/link/file';
import {CategoryToken} from '../src/link/category';
import type {Config} from '../base';
import type {Token} from '../internal';

/**
 * 解析内部链接
 * @param wikitext
 * @param config
 * @param accum
 */
export const parseLinks = (wikitext: string, config: Config, accum: Token[]): string => {
	const regex = true // eslint-disable-line no-constant-condition, @typescript-eslint/no-unnecessary-condition
			? /^((?:(?!\0\d+!\x7F)[^\n[\]{}|])+)(?:(\||\0\d+!\x7F)(.*?[^\]]))?\]\](.*)$/su
			: /^((?:(?!\0\d+!\x7F)[^\n[\]{}|])+)(?:(\||\0\d+!\x7F)(.*?[^\]])?)?\]\](.*)$/su,
		regexImg = /^((?:(?!\0\d+!\x7F)[^\n[\]{}|])+)(\||\0\d+!\x7F)(.*)$/su,
		regexExt = new RegExp(String.raw`^\s*(?:${config.protocol}|//)`, 'iu'),
		bits = wikitext.split('[[');
	let s = bits.shift()!;
	for (let i = 0; i < bits.length; i++) {
		let mightBeImg = false,
			link: string | undefined,
			delimiter: string | undefined,
			text: string | undefined,
			after: string;
		const x = bits[i]!,
			m = regex.exec(x) as [string, string, string | undefined, string | undefined, string] | null;
		if (m) {
			[, link, delimiter, text, after] = m;
			if (after.startsWith(']') && text?.includes('[')) {
				text += ']';
				after = after.slice(1);
			}
		} else {
			const m2 = regexImg.exec(x) as [string, string, string, string] | null;
			if (m2) {
				mightBeImg = true;
				[, link, delimiter, text] = m2;
			}
		}
		if (link === undefined || regexExt.test(link) || /\0\d+[exhbru]\x7F/u.test(link)) {
			s += `[[${x}`;
			continue;
		}
		const force = link.trim().startsWith(':');
		if (force && mightBeImg) {
			s += `[[${x}`;
			continue;
		}
		// @ts-expect-error private arguments
		const title = Parser.normalizeTitle(link, 0, false, config, true, true, true),
			{ns, valid, interwiki} = title;
		if (!valid) {
			s += `[[${x}`;
			continue;
		} else if (mightBeImg) {
			if (interwiki || ns !== 6) {
				s += `[[${x}`;
				continue;
			}
			let found = false;
			for (i++; i < bits.length; i++) {
				const next = bits[i]!,
					p = next.split(']]');
				if (p.length > 2) {
					found = true;
					text += `[[${p[0]!}]]${p[1]!}`;
					after = p.slice(2).join(']]');
					break;
				} else if (p.length === 2) {
					text += `[[${p[0]!}]]${p[1]!}`;
				} else {
					text += `[[${next}`;
					break;
				}
			}
			text = parseLinks(text!, config, accum);
			if (!found) {
				s += `[[${link}${delimiter!}${text}`;
				continue;
			}
		}
		text &&= parseQuotes(text, config, accum);
		let SomeLinkToken: typeof LinkToken | typeof FileToken | typeof CategoryToken = LinkToken;
		if (!force) {
			if (!interwiki && ns === 6) {
				text &&= parseExternalLinks(text, config, accum, true);
				SomeLinkToken = FileToken;
			} else if (!interwiki && ns === 14) {
				SomeLinkToken = CategoryToken;
			}
		}
		s += `\0${accum.length}l\x7F${after!}`;
		// @ts-expect-error abstract class
		new SomeLinkToken(link, text, config, accum, delimiter);
	}
	return s;
};
