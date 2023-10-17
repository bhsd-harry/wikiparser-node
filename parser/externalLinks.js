'use strict';
const string_1 = require('../util/string');
const {extUrlChar, extUrlCharFirst} = string_1;
const Parser = require('../index');
const ExtLinkToken = require('../src/extLink');

/** 解析外部链接 */
const parseExternalLinks = (wikitext, config = Parser.getConfig(), accum = []) => {
	const regex = new RegExp(`\\[((?:(?:${config.protocol}|//)${extUrlCharFirst}|\0\\d+m\x7F)${extUrlChar})(\\p{Zs}*)([^\\]\x01-\x08\x0A-\x1F\uFFFD]*)\\]`, 'giu');
	return wikitext.replace(regex, (_, url, space, text) => {
		const {length} = accum,
			mt = /&[lg]t;/u.exec(url);
		if (mt) {
			/* eslint-disable no-param-reassign */
			url = url.slice(0, mt.index);
			space = '';
			text = `${url.slice(mt.index)}${space}${text}`;
			/* eslint-enable no-param-reassign */
		}
		new ExtLinkToken(url, space, text, config, accum);
		return `\0${length}w\x7F`;
	});
};
Parser.parsers.parseExternalLinks = __filename;
module.exports = parseExternalLinks;
