import {parsers} from '../util/constants';
import * as Parser from '../index';
import {HrToken} from '../src/nowiki/hr';
import {DoubleUnderscoreToken} from '../src/nowiki/doubleUnderscore';
import {HeadingToken} from '../src/heading';
import type {AstText, Token} from '../internal';

/**
 * 解析`<hr>`和状态开关
 * @param {Token} root 根节点
 * @param config
 * @param accum
 */
export const parseHrAndDoubleUnderscore = (
	{firstChild: {data}, type, name}: Token & {firstChild: AstText},
	config = Parser.getConfig(),
	accum: Token[] = [],
): string => {
	const {doubleUnderscore} = config,
		insensitive = new Set(doubleUnderscore[0]),
		sensitive = new Set(doubleUnderscore[1]);
	if (type !== 'root' && (type !== 'ext-inner' || name !== 'poem')) {
		data = `\0${data}`;
	}
	data = data.replace(
		/^((?:\0\d+c\x7F)*)(-{4,})/gmu,
		(_, lead: string, m: string) => {
			new HrToken(m, config, accum);
			return `${lead}\0${accum.length - 1}r\x7F`;
		},
	).replace(
		new RegExp(`__(${doubleUnderscore.flat().join('|')})__`, 'giu'),
		(m, p1: string) => {
			const fixed = sensitive.has(p1);
			if (fixed || insensitive.has(p1.toLowerCase())) {
				new DoubleUnderscoreToken(p1, fixed, config, accum);
				return `\0${accum.length - 1}u\x7F`;
			}
			return m;
		},
	).replace(
		/^((?:\0\d+c\x7F)*)(={1,6})(.+)\2((?:[^\S\n]|\0\d+c\x7F)*)$/gmu,
		(_, lead: string, equals: string, heading: string, trail: string) => {
			const text = `${lead}\0${accum.length}h\x7F`;
			new HeadingToken(equals.length, [heading, trail], config, accum);
			return text;
		},
	);
	return type === 'root' || type === 'ext-inner' && name === 'poem' ? data : data.slice(1);
};

parsers['parseHrAndDoubleUnderscore'] = __filename;
