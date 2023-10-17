'use strict';
const Parser = require('../index');
const HrToken = require('../src/nowiki/hr');
const DoubleUnderscoreToken = require('../src/nowiki/doubleUnderscore');
const HeadingToken = require('../src/heading');

/**
 * 解析`<hr>`和状态开关
 * @param {Token} root 根节点
 */
const parseHrAndDoubleUnderscore = ({firstChild, type, name}, config = Parser.getConfig(), accum = []) => {
	const {doubleUnderscore} = config,
		insensitive = new Set(doubleUnderscore[0]),
		sensitive = new Set(doubleUnderscore[1]);
	let {data} = firstChild;
	if (type !== 'root' && (type !== 'ext-inner' || name !== 'poem')) {
		data = `\0${data}`;
	}
	data = data.replace(/^((?:\0\d+c\x7F)*)(-{4,})/gmu, (_, lead, m) => {
		new HrToken(m.length, config, accum);
		return `${lead}\0${accum.length - 1}r\x7F`;
	}).replace(new RegExp(`__(${doubleUnderscore.flat().join('|')})__`, 'giu'), (m, p1) => {
		if (insensitive.has(p1.toLowerCase()) || sensitive.has(p1)) {
			new DoubleUnderscoreToken(p1, config, accum);
			return `\0${accum.length - 1}u\x7F`;
		}
		return m;
	}).replace(/^((?:\0\d+c\x7F)*)(={1,6})(.+)\2((?:[^\S\n]|\0\d+c\x7F)*)$/gmu, (_, lead, equals, heading, trail) => {
		const text = `${lead}\0${accum.length}h\x7F`;
		new HeadingToken(equals.length, [heading, trail], config, accum);
		return text;
	});
	return type === 'root' || type === 'ext-inner' && name === 'poem' ? data : data.slice(1);
};
Parser.parsers.parseHrAndDoubleUnderscore = __filename;
module.exports = parseHrAndDoubleUnderscore;
