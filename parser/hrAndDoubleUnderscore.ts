import {HrToken} from '../src/nowiki/hr';
import {DoubleUnderscoreToken} from '../src/nowiki/doubleUnderscore';
import {HeadingToken} from '../src/heading';
import type {Config} from '../base';
import type {AstText, Token} from '../internal';

/**
 * 解析`<hr>`和状态开关
 * @param {Token} root 根节点
 * @param config
 * @param accum
 */
export const parseHrAndDoubleUnderscore = (
	{firstChild: {data}, type, name}: Token & {firstChild: AstText},
	config: Config,
	accum: Token[],
): string => {
	const {doubleUnderscore: [insensitive, sensitive, aliases]} = config;
	config.insensitiveDoubleUnderscore ??= new Set(insensitive);
	config.sensitiveDoubleUnderscore ??= new Set(sensitive);
	config.regexHrAndDoubleUnderscore ??= new RegExp(
		`__(${[...insensitive, ...sensitive].join('|')})__`,
		'giu',
	);
	if (type !== 'root' && (type !== 'ext-inner' || name !== 'poem')) {
		data = `\0${data}`;
	}
	data = data.replace(
		/^((?:\0\d+[cno]\x7F)*)(-{4,})/gmu,
		(_, lead: string, m: string) => {
			// @ts-expect-error abstract class
			new HrToken(m, config, accum);
			return `${lead}\0${accum.length - 1}r\x7F`;
		},
	).replace(
		config.regexHrAndDoubleUnderscore,
		(m, p1: string) => {
			const caseSensitive = config.sensitiveDoubleUnderscore!.has(p1),
				lc = p1.toLowerCase(),
				caseInsensitive = config.insensitiveDoubleUnderscore!.has(lc);
			if (caseSensitive || caseInsensitive) {
				// @ts-expect-error abstract class
				new DoubleUnderscoreToken(p1, caseSensitive, config, accum);
				return `\0${accum.length - 1}${
					caseInsensitive && (aliases?.[lc] ?? /* istanbul ignore next */ lc) === 'toc' ? 'u' : 'n'
				}\x7F`;
			}
			return m;
		},
	).replace(
		/^((?:\0\d+[cn]\x7F)*)(={1,6})(.+)\2((?:\s|\0\d+[cn]\x7F)*)$/gmu,
		(_, lead: string, equals: string, heading: string, trail: string) => {
			const text = `${lead}\0${accum.length}h\x7F`;
			// @ts-expect-error abstract class
			new HeadingToken(equals.length, [heading, trail], config, accum);
			return text;
		},
	);
	return type === 'root' || type === 'ext-inner' && name === 'poem' ? data : data.slice(1);
};
