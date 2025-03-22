import {getObjRegex} from '@bhsd/common';
import {OnlyincludeToken} from '../src/onlyinclude';
import {NoincludeToken} from '../src/nowiki/noinclude';
import {IncludeToken} from '../src/tagPair/include';
import {ExtToken} from '../src/tagPair/ext';
import {CommentToken} from '../src/nowiki/comment';
import type {RegexGetter} from '@bhsd/common';
import type {Config} from '../base';
import type {Token} from '../src/index';

const onlyincludeLeft = '<onlyinclude>',
	onlyincludeRight = '</onlyinclude>',
	{length} = onlyincludeLeft,
	getRegex = [false, true].map(includeOnly => {
		const noincludeRegex = includeOnly ? 'includeonly' : '(?:no|only)include',
			includeRegex = includeOnly ? 'noinclude' : 'includeonly';
		return getObjRegex<string[]>(ext => new RegExp(
			String.raw`<!--[\s\S]*?(?:-->|$)|<${
				noincludeRegex
			}(?:\s[^>]*)?/?>|</${noincludeRegex}\s*>|<(${
				ext.join('|')
			})(\s[^>]*?)?(?:/>|>([\s\S]*?)</(\1\s*)>)|<(${
				includeRegex
			})(\s[^>]*?)?(?:/>|>([\s\S]*?)(?:</(${includeRegex}\s*)>|$))`,
			'giu',
		));
	}) as [RegexGetter<string[]>, RegexGetter<string[]>];

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
				const token = `\0${accum.length}e\x7F`;
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
	return wikitext.replace(
		getRegex[includeOnly ? 1 : 0](config.ext),
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
				new ExtToken(name, attr, inner, closing, config, include, accum);
			} else if (substr.startsWith('<!--')) {
				ch = 'c';
				const closed = substr.endsWith('-->');
				// @ts-expect-error abstract class
				new CommentToken(substr.slice(4, closed ? -3 : undefined), closed, config, accum);
			} else if (include) {
				// @ts-expect-error abstract class
				new IncludeToken(include, includeAttr, includeInner, includeClosing, config, accum);
			} else {
				// @ts-expect-error abstract class
				new NoincludeToken(substr, config, accum);
			}
			return `\0${l}${ch}\x7F`;
		},
	);
};
