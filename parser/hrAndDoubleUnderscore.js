'use strict';

/** @typedef {import('../src')} Token */

const Parser = require('..'),
	HrToken = require('../src/nowiki/hr'),
	DoubleUnderscoreToken = require('../src/nowiki/doubleUnderscore'),
	HeadingToken = require('../src/heading');

/**
 * 解析\<hr\>和状态开关
 * @param {Token & {firstChild: import('../lib/text')}} root 根节点
 * @param {Token[]} accum
 */
const parseHrAndDoubleUnderscore = ({firstChild: {data}, type, name}, config = Parser.getConfig(), accum = []) => {
	const {doubleUnderscore} = config,
		insensitive = new Set(doubleUnderscore[0]),
		sensitive = new Set(doubleUnderscore[1]);
	if (type !== 'root' && (type !== 'ext-inner' || name !== 'poem')) {
		data = `\0${data}`;
	}
	data = data.replace(
		/^((?:\0\d+c\x7F)*)(-{4,})/gmu,
		/** @type {function(...string): string} */ (_, lead, m) => {
			new HrToken(m.length, config, accum);
			return `${lead}\0${accum.length - 1}r\x7F`;
		},
	).replace(
		new RegExp(`__(${doubleUnderscore.flat().join('|')})__`, 'giu'),
		/** @param {string} p1 */ (m, p1) => {
			if (insensitive.has(p1.toLowerCase()) || sensitive.has(p1)) {
				new DoubleUnderscoreToken(p1, config, accum);
				return `\0${accum.length - 1}u\x7F`;
			}
			return m;
		},
	).replace(
		/^((?:\0\d+c\x7F)*)(={1,6})(.+)\2((?:[^\S\n]|\0\d+c\x7F)*)$/gmu,
		/** @type {function(...string): string} */ (_, lead, equals, heading, trail) => {
			const text = `${lead}\0${accum.length}h\x7F`;
			new HeadingToken(equals.length, [heading, trail], config, accum);
			return text;
		},
	);
	return type === 'root' || type === 'ext-inner' && name === 'poem' ? data : data.slice(1);
};

module.exports = parseHrAndDoubleUnderscore;
