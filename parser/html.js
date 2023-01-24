'use strict';

const Parser = require('..'),
	AttributeToken = require('../src/attribute'),
	HtmlToken = require('../src/html');

/**
 * 解析HTML标签
 * @param {string} wikitext wikitext
 * @param {accum} accum
 */
const parseHtml = (wikitext, config = Parser.getConfig(), accum = []) => {
	const regex = /^(\/?)([a-z][^\s/>]*)([/\s][^>]*?)?(\/?>)([^<]*)$/iu,
		elements = config.html.flat(),
		bits = wikitext.split('<');
	let text = bits.shift();
	for (const x of bits) {
		const mt = regex.exec(x),
			t = mt?.[2],
			name = t?.toLowerCase();
		if (!mt || !elements.includes(name)) {
			text += `<${x}`;
			continue;
		}
		const [, slash,, params = '', brace, rest] = mt,
			attr = new AttributeToken(params, 'html-attr', name, config, accum),
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
