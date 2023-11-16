import Parser from '../index';
import {OnlyincludeToken} from '../src/onlyinclude';
import {NoincludeToken} from '../src/nowiki/noinclude';
import {IncludeToken} from '../src/tagPair/include';
import {ExtToken} from '../src/tagPair/ext';
import {CommentToken} from '../src/nowiki/comment';
import type {Token} from '../src';

/**
 * 解析HTML注释和扩展标签
 * @param wikitext
 * @param config
 * @param accum
 * @param includeOnly 是否嵌入
 */
export const parseCommentAndExt = (
	wikitext: string,
	config = Parser.getConfig(),
	accum: Token[] = [],
	includeOnly = false,
): string => {
	const onlyincludeLeft = '<onlyinclude>',
		onlyincludeRight = '</onlyinclude>',
		{length} = onlyincludeLeft;
	if (includeOnly) {
		let i = wikitext.indexOf(onlyincludeLeft),
			j = wikitext.indexOf(onlyincludeRight, i + length);
		if (i !== -1 && j !== -1) { // `<onlyinclude>`拥有最高优先级
			let str = '';
			while (i !== -1 && j !== -1) {
				const token = `\0${accum.length}e\x7F`;
				new OnlyincludeToken(wikitext.slice(i + length, j), config, accum);
				if (i > 0) {
					// @ts-expect-error abstract class
					new NoincludeToken(wikitext.slice(0, i), config, accum);
					str += `\0${accum.length - 1}c\x7F${token}`;
				} else {
					str += token;
				}
				wikitext = wikitext.slice(j + length + 1);
				i = wikitext.indexOf(onlyincludeLeft);
				j = wikitext.indexOf(onlyincludeRight, i + length);
			}
			return `${str}${wikitext}`;
		}
	}
	const ext = config.ext.join('|'),
		includeRegex = includeOnly ? 'includeonly' : '(?:no|only)include',
		noincludeRegex = includeOnly ? 'noinclude' : 'includeonly',
		regex = new RegExp(
			'<!--.*?(?:-->|$)|' // comment
			+ `<${includeRegex}(?:\\s[^>]*?)?>|</${includeRegex}\\s*>|` // <includeonly>
			+ `<(${ext})(\\s[^>]*?)?(?:/>|>(.*?)</(\\1\\s*)>)|` // 扩展标签
			+ `<(${noincludeRegex})(\\s[^>]*?)?(?:/>|>(.*?)(?:</(\\5\\s*)>|$))`, // <noinclude>
			'gisu',
		);
	return wikitext.replace(
		regex,
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
			const str = `\0${accum.length}${name ? 'e' : 'c'}\x7F`;
			if (name) {
				// @ts-expect-error abstract class
				new ExtToken(name, attr, inner, closing, config, accum);
			} else if (substr.startsWith('<!--')) {
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
			return str;
		},
	);
};

Parser.parsers['parseCommentAndExt'] = __filename;
