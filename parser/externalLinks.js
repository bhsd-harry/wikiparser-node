'use strict';

const {extUrlChar} = require('../util/string'),
	/** @type {Parser} */ Parser = require('..');

/**
 * 解析外部链接
 * @param {string} firstChild wikitext
 * @param {accum} accum
 */
const parseExternalLinks = (firstChild, config = Parser.getConfig(), accum = []) => {
	const ExtLinkToken = require('../src/extLink');
	const regex = new RegExp(
		`\\[((?:${config.protocol}|//)${extUrlChar})(\\p{Zs}*)([^\\]\x01-\x08\x0A-\x1F\uFFFD]*)\\]`,
		'giu',
	);
	return firstChild.replace(regex, /** @type {function(...string): string} */ (_, url, space, text) => {
		const {length} = accum,
			mt = /&[lg]t;/u.exec(url);
		if (mt) {
			url = url.slice(0, mt.index);
			space = '';
			text = `${url.slice(mt.index)}${space}${text}`;
		}
		new ExtLinkToken(url, space, text, config, accum);
		return `\0${length}w\x7F`;
	});
};

Parser.parsers.parseExternalLinks = __filename;
module.exports = parseExternalLinks;
