import {AttributesToken} from '../src/attributes';
import {HtmlToken} from '../src/tag/html';
import type {Config} from '../base';
import type {Token} from '../internal';

/* NOT FOR BROWSER */

import {parsers} from '../util/constants';

/* NOT FOR BROWSER END */

const regex = /^(\/?)([a-z][^\s/>]*)((?:\s|\/(?!>))[^>]*?)?(\/?>)([^<]*)$/iu;

/**
 * 解析HTML标签
 * @param wikitext
 * @param config
 * @param accum
 */
export const parseHtml = (wikitext: string, config: Config, accum: Token[]): string => {
	const {html} = config;
	config.htmlElements ??= new Set([...html[0], ...html[1], ...html[2]]);
	const bits = wikitext.split('<');
	let text = bits.shift()!;
	for (const x of bits) {
		const mt = regex.exec(x) as [string, string, string, string | undefined, string, string] | null,
			t = mt?.[2],
			name = t?.toLowerCase();
		if (!mt || !config.htmlElements.has(name!)) {
			text += `<${x}`;
			continue;
		}
		const [, slash,, params = '', brace, rest] = mt,
			{length} = accum,
			// @ts-expect-error abstract class
			attrs: AttributesToken = new AttributesToken(params, 'html-attrs', name!, config, accum),
			itemprop = attrs.hasAttr('itemprop');
		if (
			name === 'meta' && !(itemprop && attrs.hasAttr('content'))
			|| name === 'link' && !(itemprop && attrs.hasAttr('href'))
		) {
			text += `<${x}`;
			accum.length = length;
			continue;
		}
		text += `\0${accum.length}x\x7F${rest}`;
		// @ts-expect-error abstract class
		new HtmlToken(t!, attrs, slash === '/', brace === '/>', config, accum);
	}
	return text;
};

parsers['parseHtml'] = __filename;
