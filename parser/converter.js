'use strict';

const /** @type {Parser} */ Parser = require('..');

/**
 * @param {string} firstChild
 * @param {accum} accum
 */
const parseConverter = (firstChild, config = Parser.getConfig(), accum = []) => {
	const ConverterToken = require('../src/converter'),
		regex1 = /-{/g,
		regex2 = /-{|}-/g,
		/** @type {RegExpExecArray[]} */ stack = [];
	let regex = regex1,
		mt = regex.exec(firstChild);
	while (mt) {
		const {0: syntax, index} = mt;
		if (syntax === '}-') {
			const top = stack.pop(),
				{length} = accum,
				str = firstChild.slice(top.index + 2, index),
				i = str.indexOf('|'),
				[flags, text] = i === -1 ? [[], str] : [str.slice(0, i).split(';'), str.slice(i + 1)],
				temp = text.replace(/(&[#a-z0-9]+);/i, '$1\x01'),
				variants = `(?:${config.variants.join('|')})`,
				rules = temp.split(new RegExp(`;(?=\\s*(?:${variants}|[^;]*?=>\\s*${variants})\\s*:)`))
					.map(rule => rule.replaceAll('\x01', ';'));
			new ConverterToken(flags, rules, config, accum);
			firstChild = `${firstChild.slice(0, top.index)}\x00${length}v\x7f${firstChild.slice(index + 2)}`;
			if (stack.length === 0) {
				regex = regex1;
			}
			regex.lastIndex = top.index + 3 + String(length).length;
		} else {
			stack.push(mt);
			regex = regex2;
		}
		mt = regex.exec(firstChild);
	}
	return firstChild;
};

module.exports = parseConverter;
