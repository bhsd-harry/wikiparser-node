'use strict';

const Parser = require('..'),
	OnlyincludeToken = require('../src/onlyinclude'),
	NoincludeToken = require('../src/nowiki/noinclude'),
	IncludeToken = require('../src/tagPair/include'),
	ExtToken = require('../src/tagPair/ext'),
	CommentToken = require('../src/nowiki/comment');

/**
 * 解析HTML注释和扩展标签
 * @param {string} text wikitext
 * @param {accum} accum
 * @param {boolean} includeOnly 是否嵌入
 */
const parseCommentAndExt = (text, config = Parser.getConfig(), accum = [], includeOnly = false) => {
	const onlyinclude = /<onlyinclude>(.*?)<\/onlyinclude>/gsu;
	if (includeOnly && text.search(onlyinclude) !== -1) { // `<onlyinclude>`拥有最高优先级
		return text.replaceAll(onlyinclude, /** @param {string} inner */ (_, inner) => {
			const str = `\0${accum.length}e\x7F`;
			new OnlyincludeToken(inner, config, accum);
			return str;
		}).replaceAll(/(?<=^|\0\d+e\x7F).*?(?=$|\0\d+e\x7F)/gsu, substr => {
			if (substr === '') {
				return '';
			}
			new NoincludeToken(substr, config, accum);
			return `\0${accum.length - 1}c\x7F`;
		});
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
	return text.replaceAll(
		regex,
		/** @type {function(...string): string} */
		(substr, name, attr, inner, closing, include, includeAttr, includeInner, includeClosing) => {
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

Parser.parsers.parseCommentAndExt = __filename;
module.exports = parseCommentAndExt;
