'use strict';

const /** @type {Parser} */ Parser = require('..');

/**
 * @param {string} firstChild
 * @param {accum} accum
 */
const parseHrAndDoubleUnderscore = (firstChild, config = Parser.getConfig(), accum = []) => {
	const HrToken = require('../src/nowiki/hr'),
		DoubleUnderscoreToken = require('../src/nowiki/doubleUnderscore'),
		{doubleUnderscore} = config;
	return firstChild.replaceAll(/^((?:\0\d+c\x7F)*)(-{4,})/gm, (_, lead, m) => {
		new HrToken(m.length, config, accum);
		return `${lead}\0${accum.length - 1}r\x7F`;
	}).replaceAll(new RegExp(`__(${doubleUnderscore.flat().join('|')})__`, 'gi'), /** @param {string} p1 */(m, p1) => {
		if (doubleUnderscore[0].includes(p1.toLowerCase()) || doubleUnderscore[1].includes(p1)) {
			new DoubleUnderscoreToken(p1, config, accum);
			return `\0${accum.length - 1}u\x7F`;
		}
		return m;
	});
};

Parser.parsers.parseHrAndDoubleUnderscore = __filename;
module.exports = parseHrAndDoubleUnderscore;
