'use strict';

const Parser = require('..'),
	AttributesToken = require('../src/attributes'),
	HtmlToken = require('../src/html');

/**
 * 解析HTML标签
 * @param {string} wikitext wikitext
 * @param {import('../src')[]} accum
 */
const parseHtml = (wikitext, config = Parser.getConfig(), accum = []) => {
	const regex = /^(\/?)([a-z][^\s/>]*)((?:\s|\/(?!>))[^>]*?)?(\/?>)([^<]*)$/iu,
		elements = new Set(config.html.flat()),
		bits = wikitext.split('<');
	let text = bits.shift();
	for (const x of bits) {
		const mt = regex.exec(x),
			t = mt?.[2],
			name = t?.toLowerCase();
		if (!mt || !elements.has(name)) {
			text += `<${x}`;
			continue;
		}
		const [, slash,, params = '', brace, rest] = mt,
			attr = new AttributesToken(params, 'html-attrs', name, config, accum),
			itemprop = attr.getAttr('itemprop');
		if (name === 'meta' && (itemprop === undefined || attr.getAttr('content') === undefined)
			|| name === 'link' && (itemprop === undefined || attr.getAttr('href') === undefined)
		) {
			text += `<${x}`;
			accum.pop();
			continue;
		}
		text += `\0${accum.length}x\x7F${rest}`;
		new HtmlToken(t, attr, slash === '/', brace === '/>', config, accum);
	}
	return text;
};

module.exports = parseHtml;
