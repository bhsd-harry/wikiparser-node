import * as Parser from '../index';
import HrToken = require('../src/nowiki/hr');
import DoubleUnderscoreToken = require('../src/nowiki/doubleUnderscore');
import HeadingToken = require('../src/heading');
import Token = require('../src');
import AstText = require('../lib/text');

/**
 * 解析`<hr>`和状态开关
 * @param {Token} root 根节点
 */
const parseHrAndDoubleUnderscore = (
	{firstChild, type, name}: Token,
	config = Parser.getConfig(),
	accum: Token[] = [],
): string => {
	const {doubleUnderscore} = config,
		insensitive = new Set(doubleUnderscore[0]),
		sensitive = new Set(doubleUnderscore[1]);
	let {data} = firstChild as AstText;
	if (type !== 'root' && (type !== 'ext-inner' || name !== 'poem')) {
		data = `\0${data}`;
	}
	data = data.replace(
		/^((?:\0\d+c\x7F)*)(-{4,})/gmu,
		(_, lead: string, m: string) => {
			// @ts-expect-error abstract class
			new HrToken(m.length, config, accum);
			return `${lead}\0${accum.length - 1}r\x7F`;
		},
	).replace(
		new RegExp(`__(${doubleUnderscore.flat().join('|')})__`, 'giu'),
		(m, p1: string) => {
			if (insensitive.has(p1.toLowerCase()) || sensitive.has(p1)) {
				// @ts-expect-error abstract class
				new DoubleUnderscoreToken(p1, config, accum);
				return `\0${accum.length - 1}u\x7F`;
			}
			return m;
		},
	).replace(
		/^((?:\0\d+c\x7F)*)(={1,6})(.+)\2((?:[^\S\n]|\0\d+c\x7F)*)$/gmu,
		(_, lead: string, equals: string, heading: string, trail: string) => {
			const text = `${lead}\0${accum.length}h\x7F`;
			// @ts-expect-error abstract class
			new HeadingToken(equals.length, [heading, trail], config, accum);
			return text;
		},
	);
	return type === 'root' || type === 'ext-inner' && name === 'poem' ? data : data.slice(1);
};

Parser.parsers['parseHrAndDoubleUnderscore'] = __filename;
export = parseHrAndDoubleUnderscore;
