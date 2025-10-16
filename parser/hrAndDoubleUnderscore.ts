import {isUnderscore} from '@bhsd/cm-util';
import {HrToken} from '../src/nowiki/hr';
import {DoubleUnderscoreToken} from '../src/nowiki/doubleUnderscore';
import {HeadingToken} from '../src/heading';
import type {Config} from '../base';
import type {AstText, Token} from '../internal';

/* NOT FOR BROWSER */

import {parsers} from '../util/constants';

/* NOT FOR BROWSER END */

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
	const {doubleUnderscore: [insensitive, sensitive, aliases]} = config,
		all = [...insensitive, ...sensitive];
	config.insensitiveDoubleUnderscore ??= new Set(insensitive.filter(isUnderscore));
	config.sensitiveDoubleUnderscore ??= new Set(sensitive.filter(isUnderscore));
	/__(toc|notoc)__|＿{2}(目次)＿{2}/giu; // eslint-disable-line @typescript-eslint/no-unused-expressions
	config.regexHrAndDoubleUnderscore ??= new RegExp(
		`__(${
			all.filter(isUnderscore).join('|')
		})__|＿{2}(${
			all.filter(s => !isUnderscore(s)).map(s => s.slice(2, -2)).join('|')
		})＿{2}`,
		'giu',
	);
	if (type !== 'root' && (type !== 'ext-inner' || name !== 'poem')) {
		data = `\0${data}`;
	}
	data = data.replace(/^((?:\0\d+[cno]\x7F)*)(-{4,})/gmu, (_, lead: string, m: string) => {
		// @ts-expect-error abstract class
		new HrToken(m, config, accum);
		return `${lead}\0${accum.length - 1}r\x7F`;
	}).replace(config.regexHrAndDoubleUnderscore, (m, p1?: string, p2?: string) => {
		const key = p1 ?? p2!,
			caseSensitive = config.sensitiveDoubleUnderscore!.has(key),
			lc = key.toLowerCase(),
			caseInsensitive = config.insensitiveDoubleUnderscore!.has(lc);
		if (caseSensitive || caseInsensitive) {
			// @ts-expect-error abstract class
			new DoubleUnderscoreToken(key, caseSensitive, Boolean(p2), config, accum);
			return `\0${accum.length - 1}${
				caseInsensitive && (aliases?.[lc] ?? /* istanbul ignore next */ lc) === 'toc' ? 'u' : 'n'
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

parsers['parseHrAndDoubleUnderscore'] = __filename;
