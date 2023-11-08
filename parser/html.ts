import * as Parser from '../index';
import AttributesToken = require('../src/attributes');
import HtmlToken = require('../src/html');
import Token = require('../src');

/** 解析HTML标签 */
const parseHtml = (wikitext: string, config = Parser.getConfig(), accum: Token[] = []): string => {
	const regex = /^(\/?)([a-z][^\s/>]*)((?:\s|\/(?!>))[^>]*?)?(\/?>)([^<]*)$/iu,
		elements = new Set<string | undefined>(config.html.flat()),
		bits = wikitext.split('<');
	let text = bits.shift()!;
	for (const x of bits) {
		const mt = regex.exec(x) as [string, string, string, string | undefined, string, string] | null,
			t = mt?.[2],
			name = t?.toLowerCase();
		if (!mt || !elements.has(name)) {
			text += `<${x}`;
			continue;
		}
		const [, slash,, params = '', brace, rest] = mt,
			// @ts-expect-error abstract class
			attr: AttributesToken = new AttributesToken(params, 'html-attrs', name, config, accum),
			itemprop = attr.getAttr('itemprop');
		if (name === 'meta' && (itemprop === undefined || attr.getAttr('content') === undefined)
			|| name === 'link' && (itemprop === undefined || attr.getAttr('href') === undefined)
		) {
			text += `<${x}`;
			accum.pop();
			continue;
		}
		text += `\0${accum.length}x\x7F${rest}`;
		// @ts-expect-error abstract class
		new HtmlToken(t, attr, slash === '/', brace === '/>', config, accum);
	}
	return text;
};

Parser.parsers['parseHtml'] = __filename;
export = parseHtml;
