'use strict';

const {extUrlChar} = require('../util/string'),
	Parser = require('..');

/**
 * 解析自由外链
 * @param {string} wikitext wikitext
 * @param {accum} accum
 */
const parseMagicLinks = (wikitext, config = Parser.getConfig(), accum = []) => {
	const MagicLinkToken = require('../src/magicLink');
	const regex = new RegExp(`\\b(?:${config.protocol})(${extUrlChar})`, 'giu');
	return wikitext.replace(regex, /** @param {string} p1 */ (m, p1) => {
		let trail = '',
			url = m;
		const m2 = /&(?:lt|gt|nbsp|#x0*(?:3[ce]|a0)|#0*(?:6[02]|160));/iu.exec(url);
		if (m2) {
			trail = url.slice(m2.index);
			url = url.slice(0, m2.index);
		}
		const sep = new RegExp(`[,;.:!?${url.includes('(') ? '' : ')'}]+$`, 'u'),
			sepChars = sep.exec(url);
		if (sepChars) {
			let correction = 0;
			if (sepChars[0][0] === ';' && /&(?:[a-z]+|#x[\da-f]+|#\d+)$/iu.test(url.slice(0, sepChars.index))) {
				correction = 1;
			}
			trail = `${url.slice(sepChars.index + correction)}${trail}`;
			url = url.slice(0, sepChars.index + correction);
		}
		if (trail.length >= p1.length) {
			return m;
		}
		new MagicLinkToken(url, false, config, accum);
		return `\0${accum.length - 1}w\x7F${trail}`;
	});
};

Parser.parsers.parseMagicLinks = __filename;
module.exports = parseMagicLinks;
