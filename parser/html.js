'use strict';

const /** @type {Parser} */ Parser = require('..');

/**
 * 解析HTML标签
 * @param {string} firstChild wikitext
 * @param {ParserConfig} config 设置
 * @param {accum} accum 嵌套的节点数组
 */
const parseHtml = (firstChild, config = Parser.getConfig(), accum = []) => {
	const regex = /^(\/?)([a-z][^\s/>]*)(\s[^>]*?)?(\/?>)([^<]*)$/iu,
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
		const AttributeToken = require('../src/attribute');
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
		const HtmlToken = require('../src/html');
		new HtmlToken(t, attr, slash === '/', brace === '/>', config, accum);
	}
	return text;
};

Parser.parsers.parseHtml = __filename;
module.exports = parseHtml;
