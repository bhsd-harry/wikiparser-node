import {parsers} from '../util/constants';
import * as Parser from '../index';
import {OnlyincludeToken} from '../src/onlyinclude';
import {NoincludeToken} from '../src/nowiki/noinclude';
import {IncludeToken} from '../src/tagPair/include';
import {ExtToken} from '../src/tagPair/ext';
import {CommentToken} from '../src/nowiki/comment';
import type {Token} from '../src/index';

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
					new NoincludeToken(wikitext.slice(0, i), config, accum);
					str += `\0${accum.length - 1}c\x7F${token}`;
				} else {
					str += token;
				}
				wikitext = wikitext.slice(j + length + 1);
				i = wikitext.indexOf(onlyincludeLeft);
				j = wikitext.indexOf(onlyincludeRight, i + length);
			}
			if (wikitext) {
				new NoincludeToken(wikitext, config, accum);
				str += `\0${accum.length - 1}c\x7F`;
			}
			return str;
		}
	}
	const ext = config.ext.join('|'),
		noincludeRegex = includeOnly ? 'includeonly' : '(?:no|only)include',
		includeRegex = includeOnly ? 'noinclude' : 'includeonly',
		regex = new RegExp(
			'<!--.*?(?:-->|$)|' // comment
			+ `<${noincludeRegex}(?:\\s[^>]*?)?>|</${noincludeRegex}\\s*>|` // <noinclude>
			+ `<(${ext})(\\s[^>]*?)?(?:/>|>(.*?)</(\\1\\s*)>)|` // 扩展标签
			+ `<(${includeRegex})(\\s[^>]*?)?(?:/>|>(.*?)(?:</(${includeRegex}\\s*)>|$))`, // <includeonly>
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
				new ExtToken(name, attr, inner, closing, config, accum);
			} else if (substr.startsWith('<!--')) {
				const closed = substr.endsWith('-->');
				new CommentToken(substr.slice(4, closed ? -3 : undefined), closed, config, accum);
			} else if (include) {
				new IncludeToken(include, includeAttr, includeInner, includeClosing, config, accum);
			} else {
				new NoincludeToken(substr, config, accum);
			}
			return str;
		},
	);
};

parsers['parseCommentAndExt'] = __filename;
