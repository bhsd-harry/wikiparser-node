import {getRegex} from '@bhsd/common';
import {restore} from '../util/string';
import {OnlyincludeToken} from '../src/onlyinclude';
import {NoincludeToken} from '../src/nowiki/noinclude';
import {TranslateToken} from '../src/tagPair/translate';
import {IncludeToken} from '../src/tagPair/include';
import {ExtToken} from '../src/tagPair/ext';
import {CommentToken} from '../src/nowiki/comment';
import type {RegexGetter} from '@bhsd/common';
import type {Config} from '../base';
import type {Token} from '../internal';

const onlyincludeLeft = '<onlyinclude>',
	onlyincludeRight = '</onlyinclude>',
	{length} = onlyincludeLeft,
	getExtRegex = [false, true].map(includeOnly => {
		const noincludeRegex = includeOnly ? 'includeonly' : '(?:no|only)include',
			includeRegex = includeOnly ? 'noinclude' : 'includeonly';
		return getRegex(exts => new RegExp(
			String.raw`<!--[\s\S]*?(?:-->|$)|<${
				noincludeRegex
			}(?:\s[^>]*)?/?>|</${noincludeRegex}\s*>|<(${
				exts // eslint-disable-next-line unicorn/prefer-string-raw
			})(\s[^>]*?)?(?:/>|>([\s\S]*?)</(${'\\1'}\s*)>)|<(${
				includeRegex
			})(\s[^>]*?)?(?:/>|>([\s\S]*?)(?:</(${includeRegex}\s*)>|$))`,
			'giu',
		));
	}) as [RegexGetter, RegexGetter];

/**
 * 更新`<onlyinclude>`和`</onlyinclude>`的位置
 * @param wikitext
 */
const update = (wikitext: string): {i: number, j: number} => {
	const i = wikitext.indexOf(onlyincludeLeft);
	return {i, j: wikitext.indexOf(onlyincludeRight, i + length)};
};

/**
 * 解析HTML注释和扩展标签
 * @param wikitext
 * @param config
 * @param accum
 * @param includeOnly 是否嵌入
 */
export const parseCommentAndExt = (wikitext: string, config: Config, accum: Token[], includeOnly: boolean): string => {
	if (includeOnly) {
		let {i, j} = update(wikitext);
		if (i !== -1 && j !== -1) { // `<onlyinclude>`拥有最高优先级
			let str = '';

			/**
			 * 忽略未被`<onlyinclude>`和`</onlyinclude>`包裹的内容
			 * @param text 未被包裹的内容
			 */
			const noinclude = (text: string): void => {
				// @ts-expect-error abstract class
				new NoincludeToken(text, config, accum);
				str += `\0${accum.length - 1}n\x7F`;
			};
			while (i !== -1 && j !== -1) {
				const token = `\0${accum.length}g\x7F`;
				new OnlyincludeToken(wikitext.slice(i + length, j), config, accum);
				if (i > 0) {
					noinclude(wikitext.slice(0, i));
				}
				str += token;
				wikitext = wikitext.slice(j + length + 1);
				({i, j} = update(wikitext));
			}
			if (wikitext) {
				noinclude(wikitext);
			}
			return str;
		}
	}
	const {ext} = config;
	let newExt = ext,
		newConfig = config;
	if (ext.includes('translate')) {
		newExt = ext.filter(e => e !== 'translate' && e !== 'tvar');
		newConfig = {...config, ext: newExt};
		const stack: string[] = [];
		wikitext = wikitext.replace(/<nowiki>[\s\S]*?<\/nowiki>/giu, m => {
			stack.push(m);
			return `\0${stack.length - 1}\x7F`;
		}).replace(
			/<translate( nowrap)?>([\s\S]*?)<\/translate>/gu,
			(_, p1: string | undefined, p2: string) => {
				const l = accum.length;
				// @ts-expect-error abstract class
				new TranslateToken(p1, p2 && restore(p2, stack), newConfig, accum);
				return `\0${l}g\x7F`;
			},
		);
		wikitext = restore(wikitext, stack);
	}
	const re = getExtRegex[includeOnly ? 1 : 0](newExt.join('|'));
	re.lastIndex = 0;
	return re.test(wikitext)
		? wikitext.replace(
			re,
			(
				substr,
				name?: string,
				attr?: string,
				inner?: string,
				closing?: string,
				include?: string,
				includeAttr?: string,
				includeInner?: string,
				includeClosing?: string,
			) => {
				const l = accum.length;
				let ch = 'n';
				if (name) {
					ch = 'e';
					// @ts-expect-error abstract class
					new ExtToken(name, attr, inner, closing, newConfig, include, accum);
				} else if (substr.startsWith('<!--')) {
					ch = 'c';
					const closed = substr.endsWith('-->');
					// @ts-expect-error abstract class
					new CommentToken(
						restore(substr, accum, 1).slice(4, closed ? -3 : undefined),
						closed,
						config,
						accum,
					);
				} else if (include) {
					// @ts-expect-error abstract class
					new IncludeToken(
						include,
						includeAttr && restore(includeAttr, accum, 1),
						includeInner && restore(includeInner, accum, 1),
						includeClosing,
						config,
						accum,
					);
				} else {
					// @ts-expect-error abstract class
					new NoincludeToken(substr, config, accum, true);
				}
				return `\0${l}${ch}\x7F`;
			},
		)
		: wikitext;
};
