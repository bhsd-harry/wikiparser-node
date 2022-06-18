'use strict';

const /** @type {Parser} */ Parser = require('..');

/**
 * @param {string} firstChild
 * @param {accum} accum
 */
const parseHrAndDoubleUnderscore = (firstChild, config = Parser.getConfig(), accum = []) => {
	const HrToken = require('../src/nowikiToken/hrToken'),
		DoubleUnderscoreToken = require('../src/nowikiToken/doubleUnderscoreToken'),
		{doubleUnderscore} = config;
	return firstChild.replace(/^-{4,}/mg, m => {
		new HrToken(m.length, accum);
		return `\x00${accum.length - 1}r\x7f`;
	}).replace(new RegExp(`__(${doubleUnderscore.flat().join('|')})__`, 'ig'), /** @param {string} p1 */(m, p1) => {
		if (doubleUnderscore[0].includes(p1.toLowerCase()) || doubleUnderscore[1].includes(p1)) {
			new DoubleUnderscoreToken(p1, accum);
			return `\x00${accum.length - 1}u\x7f`;
		}
		return m;
	});
};

Parser.parsers.parseHrAndDoubleUnderscore = __filename;
module.exports = parseHrAndDoubleUnderscore;
