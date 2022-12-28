'use strict';

const /** @type {Parser} */ Parser = require('..');

/**
 * @param {string} firstChild
 * @param {accum} accum
 */
const parseHtml = (firstChild, config = Parser.getConfig(), accum = []) => {
	const regex = /^(\/?)([a-z][^\s/>]*)([^>]*?)(\/?>)([^<]*)$/i,
		elements = config.html.flat(),
		bits = firstChild.split('<');
	let text = bits.shift();
	for (const x of bits) {
		const mt = regex.exec(x),
			t = mt?.[2],
			name = t?.toLowerCase();
		if (!mt || !elements.includes(name)) {
			text += `<${x}`;
			continue;
		}
		const [, slash,, params, brace, rest] = mt,
			AttributeToken = require('../src/attribute'),
			attr = new AttributeToken(params, 'html-attr', name, config, accum),
			itemprop = attr.getAttr('itemprop');
		if (name === 'meta' && (itemprop === undefined || attr.getAttr('content') === undefined)
			|| name === 'link' && (itemprop === undefined || attr.getAttr('href') === undefined)
		) {
			text += `<${x}`;
			accum.pop();
			continue;
		}
		text += `\0${accum.length}x\x7f${rest}`;
		const HtmlToken = require('../src/html');
		new HtmlToken(t, attr, slash === '/', brace === '/>', config, accum);
	}
	return text;
};

Parser.parsers.parseHtml = __filename;
module.exports = parseHtml;
