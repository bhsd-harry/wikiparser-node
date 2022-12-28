'use strict';

const {extUrlChar} = require('../util/string'),
	/** @type {Parser} */ Parser = require('..');

/**
 * @param {string} firstChild
 * @param {accum} accum
 */
const parseExternalLinks = (firstChild, config = Parser.getConfig(), accum = []) => {
	const ExtLinkToken = require('../src/extLink'),
		regex = RegExp(
			`\\[((?:${config.protocol}|//)${extUrlChar})(\\p{Zs}*)([^\\]\x01-\x08\x0a-\x1f\ufffd]*)\\]`,
			'giu',
		);
	return firstChild.replace(regex, /** @type {function(...string): string} */ (_, url, space, text) => {
		const {length} = accum,
			mt = /&[lg]t;/.exec(url);
		if (mt) {
			url = url.slice(0, mt.index);
			space = '';
			text = `${url.slice(mt.index)}${space}${text}`;
		}
		new ExtLinkToken(url, space, text, config, accum);
		return `\0${length}w\x7f`;
	});
};

module.exports = parseExternalLinks;
