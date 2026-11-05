import {getRegex} from '@bhsd/common';
import {restore} from '../util/string';
import {
	safeStringReplace,
	safePatternReplace,
} from '../util/replace';
import {OnlyincludeToken} from '../src/onlyinclude';
import {NoincludeToken} from '../src/nowiki/noinclude';
import {IncludeToken} from '../src/tagPair/include';
import {ExtToken} from '../src/tagPair/ext';
import {CommentToken} from '../src/nowiki/comment';
import type {RegexGetter} from '@bhsd/common';
import type {Config} from '../base';
import type * as Translate from '../src/tagPair/translate';
import type {Token} from '../internal';

/* NOT FOR BROWSER */

import {parsers} from '../util/constants';

/* NOT FOR BROWSER END */

const onlyincludeLeft = '<onlyinclude>',
	onlyincludeRight = '</onlyinclude>',
	getExtRegex = [false, true].map(includeOnly => {
		const noincludeRegex = includeOnly ? 'includeonly' : '(?:no|only)include',
			includeRegex = includeOnly ? 'noinclude' : 'includeonly';
		// eslint-disable-next-line @typescript-eslint/no-unused-expressions
		/<!--.*?(?:-->|$)|<foo(?=\s|\/?>)|<\/foo\s*>|<(bar)(?=\s|\/?>)|<(baz)(?=\s|\/?>)/gisu;
		return getRegex(exts => new RegExp(
			String.raw`<!--.*?(?:-->|$)|<${noincludeRegex}(?=\s|\/?>)|</${noincludeRegex}\s*>|<(${exts})(?=\s|\/?>)|<(${
				includeRegex
			})(?=\s|\/?>)`,
			'gisu',
		));
	}) as [RegexGetter, RegexGetter];

/**
 * 解析HTML注释和扩展标签
 * @param wikitext
 * @param config
 * @param accum
 * @param includeOnly 是否嵌入
 */
export const parseCommentAndExt = (wikitext: string, config: Config, accum: Token[], includeOnly: boolean): string => {
	if (includeOnly) {
		const i = wikitext.indexOf(onlyincludeLeft);
		if (i !== -1 && wikitext.includes(onlyincludeRight, i)) { // `<onlyinclude>`拥有最高优先级
			return safeStringReplace(
				wikitext,
				onlyincludeLeft,
				onlyincludeRight,
				false,
				inner => {
					const token = `\0${accum.length}g\x7F`;
					new OnlyincludeToken(inner, config, accum);
					return token;
				},
				s => {
					if (!s) {
						return '';
					}
					// @ts-expect-error abstract class
					new NoincludeToken(s, config, accum);
					return `\0${accum.length - 1}n\x7F`;
				},
			);
		}
	}
	const {ext} = config;
	let newExt = ext,
		newConfig = config;
	if (ext.includes('translate')) {
		const {TranslateToken}: typeof Translate = require('../src/tagPair/translate');
		const stack: string[] = [];
		newExt = ext.filter(e => e !== 'translate' && e !== 'tvar');
		newConfig = {...config, ext: newExt};

		// 隐藏`<nowiki>`标签
		const text = safeStringReplace(
			wikitext,
			'<nowiki>',
			'</nowiki>',
			true,
			(inner, open, close) => {
				stack.push(open + inner + close);
				return `\0${stack.length - 1}\x7F`;
			},
		);

		// 解析`<translate>`标签
		wikitext = safePatternReplace(
			text,
			/<translate( nowrap)?>/gu,
			'</translate>',
			(inner, [, p1]) => {
				const l = accum.length;
				// @ts-expect-error abstract class
				new TranslateToken(p1, inner && restore(inner, stack), newConfig, accum);
				return `\0${l}g\x7F`;
			},
		);
		wikitext = restore(wikitext, stack);
	}
	const re = getExtRegex[includeOnly ? 1 : 0](newExt.join('|')),
		noMoreTags = new Set<string>();
	re.lastIndex = 0;
	let lastIndex = 0,
		text = '',
		noMoreGt = false;
	for (let mt = re.exec(wikitext); mt; mt = re.exec(wikitext)) {
		const [substr, name, include] = mt,
			tag = name || include,
			{index} = mt,
			l = accum.length;
		text += wikitext.slice(lastIndex, index);
		({lastIndex} = re);
		let ch = 'n',
			matched = true;
		if (substr.startsWith('<!--')) {
			ch = 'c';
			const closed = substr.endsWith('-->');
			// @ts-expect-error abstract class
			new CommentToken(
				restore(substr, accum, 1)
					.slice(4, closed ? -3 : undefined),
				closed,
				config,
				accum,
			);
		} else if (noMoreGt) {
			matched = false;
		} else if (tag) {
			const i = wikitext.indexOf('>', lastIndex);
			let attr: string | undefined,
				inner: string | undefined,
				closing: string | undefined;
			if (i === -1) {
				matched = false;
				noMoreGt = true;
			} else if (wikitext[i - 1] === '/') {
				attr = wikitext.slice(lastIndex, i - 1);
				lastIndex = i + 1;
				re.lastIndex = lastIndex;
			} else if (noMoreTags.has(tag.toLowerCase())) {
				matched = false;
			} else {
				attr = wikitext.slice(lastIndex, i);
				const after = wikitext.slice(i + 1),
					m = new RegExp(String.raw`</(${tag}\s*)>`, 'iu').exec(after);
				if (m) {
					inner = after.slice(0, m.index);
					[, closing] = m;
					lastIndex = i + 1 + m.index + m[0].length;
					re.lastIndex = lastIndex;
				} else if (include) {
					inner = after;
					lastIndex = wikitext.length;
					re.lastIndex = lastIndex;
				} else {
					matched = false;
					noMoreTags.add(tag.toLowerCase());
				}
			}
			if (matched) {
				if (name) {
					ch = 'e';
					// @ts-expect-error abstract class
					new ExtToken(name, attr, inner, closing, newConfig, include, accum);
				} else {
					// @ts-expect-error abstract class
					new IncludeToken(
						include,
						attr && restore(attr, accum, 1),
						inner && restore(inner, accum, 1),
						closing,
						config,
						accum,
					);
				}
			}
		} else if (substr.startsWith('</')) {
			// @ts-expect-error abstract class
			new NoincludeToken(wikitext.slice(index, lastIndex), config, accum, true);
		} else {
			const i = wikitext.indexOf('>', lastIndex);
			if (i === -1) {
				matched = false;
				noMoreGt = true;
			} else {
				lastIndex = i + 1;
				re.lastIndex = lastIndex;
				// @ts-expect-error abstract class
				new NoincludeToken(wikitext.slice(index, lastIndex), config, accum, true);
			}
		}
		text += matched ? `\0${l}${ch}\x7F` : substr;
	}
	return text + wikitext.slice(lastIndex);
};

parsers['parseCommentAndExt'] = __filename;
