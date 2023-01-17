'use strict';

const Parser = require('..'),
	ListToken = require('../src/nowiki/list'),
	DdToken = require('../src/nowiki/dd');

/**
 * 解析列表
 * @param {string} text wikitext
 * @param {accum} accum
 */
const parseList = (text, config = Parser.getConfig(), accum = []) => {
	const mt = /^((?:\0\d+c\x7F)*)([;:*#]+)/u.exec(text);
	if (!mt) {
		return text;
	}
	const [total, comment, prefix] = mt;
	text = `${comment}\0${accum.length}d\x7F${text.slice(total.length)}`;
	new ListToken(prefix, config, accum);
	let dt = prefix.split(';').length - 1;
	if (!dt) {
		return text;
	}
	let regex = /:+|-\{/gu,
		ex = regex.exec(text),
		lc = 0;
	while (ex && dt) {
		const {0: syntax, index} = ex;
		if (syntax[0] === ':') {
			if (syntax.length >= dt) {
				new DdToken(':'.repeat(dt), config, accum);
				return `${text.slice(0, index)}\0${accum.length - 1}d\x7F${text.slice(index + dt)}`;
			}
			text = `${text.slice(0, index)}\0${accum.length}d\x7F${text.slice(regex.lastIndex)}`;
			dt -= syntax.length;
			regex.lastIndex = index + 4 + String(accum.length).length;
			new DdToken(syntax, config, accum);
		} else if (syntax === '-{') {
			if (!lc) {
				const {lastIndex} = regex;
				regex = /-\{|\}-/gu;
				regex.lastIndex = lastIndex;
			}
			lc++;
		} else {
			lc--;
			if (!lc) {
				const {lastIndex} = regex;
				regex = /:+|-\{/gu;
				regex.lastIndex = lastIndex;
			}
		}
		ex = regex.exec(text);
	}
	return text;
};

module.exports = parseList;
