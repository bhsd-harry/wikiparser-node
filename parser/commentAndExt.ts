import * as Parser from '../index';
import OnlyincludeToken = require('../src/onlyinclude');
import NoincludeToken = require('../src/nowiki/noinclude');
import IncludeToken = require('../src/tagPair/include');
import ExtToken = require('../src/tagPair/ext');
import CommentToken = require('../src/nowiki/comment');
import Token = require('../src');

/**
 * 解析HTML注释和扩展标签
 * @param includeOnly 是否嵌入
 */
const parseCommentAndExt = (
	wikitext: string,
	config = Parser.getConfig(),
	accum: Token[] = [],
	includeOnly = false,
): string => {
	const onlyinclude = /<onlyinclude>(.*?)<\/onlyinclude>/gsu;
	if (includeOnly && wikitext.search(onlyinclude) !== -1) { // `<onlyinclude>`拥有最高优先级
		return wikitext.replace(onlyinclude, (_, inner: string) => {
			const str = `\0${accum.length}e\x7F`;
			new OnlyincludeToken(inner, config, accum);
			return str;
		}).replace(
			/(?<=^|\0\d+e\x7F)[^\0]+(?=$|\0\d+e\x7F)/gu,
			substr => {
				// @ts-expect-error abstract class
				new NoincludeToken(substr, config, accum);
				return `\0${accum.length - 1}c\x7F`;
			},
		);
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
export = parseCommentAndExt;
