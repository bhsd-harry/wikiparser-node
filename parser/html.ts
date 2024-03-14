import Parser from '../index';
import {AttributesToken} from '../src/attributes';
import {HtmlToken} from '../src/html';
import type {Token} from '../src/index';

/**
 * 解析HTML标签
 * @param wikitext
 * @param config
 * @param accum
 */
export const parseHtml = (wikitext: string, config = Parser.getConfig(), accum: Token[] = []): string => {
	const regex = /^(\/?)([a-z][^\s/>]*)((?:\s|\/(?!>))[^>]*?)?(\/?>)([^<]*)$/iu,
		elements = new Set(config.html.flat()),
		bits = wikitext.split('<');
	let text = bits.shift()!;
	for (const x of bits) {
		const mt = regex.exec(x) as [string, string, string, string | undefined, string, string] | null,
			t = mt?.[2],
			name = t?.toLowerCase();
		if (!mt || !elements.has(name!)) {
			text += `<${x}`;
			continue;
		}
		const [, slash,, params = '', brace, rest] = mt,
			// @ts-expect-error abstract class
			attrs: AttributesToken = new AttributesToken(params, 'html-attrs', name!, config, accum),
			itemprop = attrs.getAttr('itemprop');
		if (
			name === 'meta' && (itemprop === undefined || attrs.getAttr('content') === undefined)
			|| name === 'link' && (itemprop === undefined || attrs.getAttr('href') === undefined)
		) {
			text += `<${x}`;
			accum.length = accum.indexOf(attrs);
			continue;
		}
		text += `\0${accum.length}x\x7F${rest}`;
		// @ts-expect-error abstract class
		new HtmlToken(t!, attrs, slash === '/', brace === '/>', config, accum);
	}
	return text;
};
