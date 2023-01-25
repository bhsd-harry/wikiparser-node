'use strict';

const Parser = require('..'),
	AstText = require('../lib/text'),
	Token = require('../src'),
	HrToken = require('../src/nowiki/hr'),
	DoubleUnderscoreToken = require('../src/nowiki/doubleUnderscore');

/**
 * 解析\<hr\>和状态开关
 * @param {Token & {firstChild: AstText}} root 根节点
 * @param {accum} accum
 */
const parseHrAndDoubleUnderscore = ({firstChild: {data}, type, name}, config = Parser.getConfig(), accum = []) => {
	const {doubleUnderscore} = config,
		insensitive = new Set(doubleUnderscore[0]),
		sensitive = new Set(doubleUnderscore[1]);
	if (type !== 'root' && (type !== 'ext-inner' || name !== 'poem')) {
		data = `\0${data}`;
	}
	data = data.replace(/^((?:\0\d+c\x7F)*)(-{4,})/gmu, (_, lead, m) => {
		new HrToken(m.length, config, accum);
		return `${lead}\0${accum.length - 1}r\x7F`;
	}).replace(
		new RegExp(`__(${doubleUnderscore.flat().join('|')})__`, 'giu'),
		/** @param {string} p1 */ (m, p1) => {
			if (insensitive.has(p1.toLowerCase()) || sensitive.has(p1)) {
				new DoubleUnderscoreToken(p1, config, accum);
				return `\0${accum.length - 1}u\x7F`;
			}
			return m;
		},
	);
	return type === 'root' || type === 'ext-inner' && name === 'poem' ? data : data.slice(1);
};

Parser.parsers.parseHrAndDoubleUnderscore = __filename;
module.exports = parseHrAndDoubleUnderscore;
