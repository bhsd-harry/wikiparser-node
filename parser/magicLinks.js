'use strict';

const {extUrlChar} = require('../util/string'),
	/** @type {Parser} */ Parser = require('..');

/**
 * @param {string} firstChild
 * @param {accum} accum
 */
const parseMagicLinks = (firstChild, config = Parser.getConfig(), accum = []) => {
	const MagicLinkToken = require('../src/magicLinkToken'),
		regex = new RegExp(`\\b(?:${config.protocol})(${extUrlChar})`, 'gui');
	return firstChild.replace(regex, /** @param {string} p1 */ (m, p1) => {
		let trail = '',
			url = m;
		const m2 = url.match(/&(?:lt|gt|nbsp|#x0*(?:3[ce]|a0)|#0*(?:6[02]|160));/i);
		if (m2) {
			trail = url.slice(m2.index);
			url = url.slice(0, m2.index);
		}
		const sep = new RegExp(`[,;.:!?${url.includes('(') ? '' : ')'}]+$`),
			sepChars = url.match(sep);
		if (sepChars) {
			let correction = 0;
			if (sepChars[0].startsWith(';') && /&(?:[a-z]+|#x[\da-f]+|#\d+)$/i.test(url.slice(0, sepChars.index))) {
				correction = 1;
			}
			trail = `${url.slice(sepChars.index + correction)}${trail}`;
			url = url.slice(0, sepChars.index + correction);
		}
		if (trail.length >= p1.length) {
			return m;
		}
		new MagicLinkToken(url, accum);
		return `\x00${accum.length - 1}w\x7f${trail}`;
	});
};

Parser.parsers.parseMagicLinks = __filename;
module.exports = parseMagicLinks;
