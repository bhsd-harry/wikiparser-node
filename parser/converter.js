'use strict';

const Parser = require('..'),
	ConverterToken = require('../src/converter');

/**
 * 解析语言变体转换
 * @param {string} wikitext wikitext
 * @param {accum} accum
 */
const parseConverter = (wikitext, config = Parser.getConfig(), accum = []) => {
	const regex1 = /-\{/gu,
		regex2 = /-\{|\}-/gu,
		/** @type {RegExpExecArray[]} */ stack = [];
	let regex = regex1,
		mt = regex.exec(wikitext);
	while (mt) {
		const {0: syntax, index} = mt;
		if (syntax === '}-') {
			const top = stack.pop(),
				{length} = accum,
				str = wikitext.slice(top.index + 2, index),
				i = str.indexOf('|'),
				[flags, text] = i === -1 ? [[], str] : [str.slice(0, i).split(';'), str.slice(i + 1)],
				temp = text.replaceAll(/(&[#a-z\d]+);/giu, '$1\x01'),
				variants = `(?:${config.variants.join('|')})`,
				rules = temp.split(new RegExp(`;(?=\\s*(?:${variants}|[^;]*?=>\\s*${variants})\\s*:)`, 'u'))
					.map(rule => rule.replaceAll('\x01', ';'));
			new ConverterToken(flags, rules, config, accum);
			wikitext = `${wikitext.slice(0, top.index)}\0${length}v\x7F${wikitext.slice(index + 2)}`;
			if (stack.length === 0) {
				regex = regex1;
			}
			regex.lastIndex = top.index + 3 + String(length).length;
		} else {
			stack.push(mt);
			regex = regex2;
		}
		mt = regex.exec(wikitext);
	}
	return wikitext;
};

module.exports = parseConverter;
