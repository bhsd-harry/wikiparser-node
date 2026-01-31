import {isUnderscore} from '@bhsd/cm-util';
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
	const [insensitive, sensitive, aliases] = config.doubleUnderscore,
		all = [...insensitive, ...sensitive];
	config.insensitiveDoubleUnderscore ??= new Set(insensitive.filter(isUnderscore));
	config.sensitiveDoubleUnderscore ??= new Set(sensitive.filter(isUnderscore));
	config.regexHrAndDoubleUnderscore ??= new RegExp(
		String.raw`^((?:\0\d+[cno]\x7F)*)(-{4,})|__(${
			all.filter(isUnderscore).join('|')
		})__|＿{2}(${
			all.filter(s => !isUnderscore(s)).map(s => s.slice(2, -2)).join('|')
		})＿{2}`,
		'gimu',
	);
	if (type !== 'root' && (type !== 'ext-inner' || name !== 'poem')) {
		data = `\0${data}`;
	}
	data = data.replace(config.regexHrAndDoubleUnderscore, (m, p1?: string, p2?: string, p3?: string, p4?: string) => {
		if (p2) {
			// @ts-expect-error abstract class
			new HrToken(p2, config, accum);
			return `${p1}\0${accum.length - 1}r\x7F`;
		}
		const key = p3 ?? p4!,
			caseSensitive = config.sensitiveDoubleUnderscore!.has(key),
			lc = key.toLowerCase(),
			caseInsensitive = config.insensitiveDoubleUnderscore!.has(lc);
		if (caseSensitive || caseInsensitive) {
			// @ts-expect-error abstract class
			new DoubleUnderscoreToken(key, caseSensitive, Boolean(p4), config, accum);
			return `\0${accum.length - 1}${
				caseInsensitive && (aliases?.[lc] ?? /* c8 ignore next */ lc) === 'toc' ? 'u' : 'n'
			}\x7F`;
		}
		return m;
	});
	if (!config.excludes.includes('heading')) {
		data = data.replace(
			/^((?:\0\d+[cn]\x7F)*)(={1,6})(.+)\2((?:\s|\0\d+[cn]\x7F)*)$/gmu,
			(_, lead: string, equals: string, heading: string, trail: string) => {
				const text = `${lead}\0${accum.length}h\x7F`;
				// @ts-expect-error abstract class
				new HeadingToken(equals.length, [heading, trail], config, accum);
				return text;
			},
		);
	}
	return type === 'root' || type === 'ext-inner' && name === 'poem' ? data : data.slice(1);
};
