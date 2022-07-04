'use strict';

const /** @type {Parser} */ Parser = require('..');

/**
 * @param {string} text
 * @param {accum} accum
 */
const parseList = (text, config = Parser.getConfig(), accum = []) => {
	const mt = text.match(/^(?:[;:*#]|\x00\d+c\x7f)*[;:*#]/);
	if (!mt) {
		return text;
	}
	const ListToken = require('../src/nowiki/list'),
		[prefix] = mt;
	text = `\x00${accum.length}d\x7f${text.slice(prefix.length)}`;
	new ListToken(prefix, config, accum);
	let dt = prefix.split(';').length - 1;
	if (!dt) {
		return text;
	}
	const DdToken = require('../src/nowiki/dd');
	let regex = /:+|-{/g,
		ex = regex.exec(text),
		lc = 0;
	while (ex && dt) {
		const {0: syntax, index} = ex;
		if (syntax[0] === ':') {
			if (syntax.length >= dt) {
				new DdToken(':'.repeat(dt), config, accum);
				return `${text.slice(0, index)}\x00${accum.length - 1}d\x7f${text.slice(index + dt)}`;
			}
			text = `${text.slice(0, index)}\x00${accum.length}d\x7f${text.slice(regex.lastIndex)}`;
			dt -= syntax.length;
			regex.lastIndex = index + 4 + String(accum.length).length;
			new DdToken(syntax, config, accum);
		} else if (syntax === '-{') {
			if (!lc) {
				const {lastIndex} = regex;
				regex = /-{|}-/g;
				regex.lastIndex = lastIndex;
			}
			lc++;
		} else {
			lc--;
			if (!lc) {
				const {lastIndex} = regex;
				regex = /:+|-{/g;
				regex.lastIndex = lastIndex;
			}
		}
		ex = regex.exec(text);
	}
	return text;
};

Parser.parsers.parseList = __filename;
module.exports = parseList;
