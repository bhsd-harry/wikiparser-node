'use strict';

const /** @type {Parser} */ Parser = require('..');

/**
 * 解析HTML注释和扩展标签
 * @param {string} text wikitext
 * @param {ParserConfig} config 设置
 * @param {accum} accum 嵌套的节点数组
 * @param {boolean} includeOnly 是否嵌入
 */
const parseCommentAndExt = (text, config = Parser.getConfig(), accum = [], includeOnly = false) => {
	const onlyinclude = /<onlyinclude>(.*?)<\/onlyinclude>/gsu;
	if (includeOnly && text.search(onlyinclude) !== -1) { // `<onlyinclude>`拥有最高优先级
		return text.replaceAll(onlyinclude, /** @param {string} inner 标签内部文字 */ (_, inner) => {
			const str = `\0${accum.length}e\x7F`;
			const OnlyincludeToken = require('../src/onlyinclude');
			new OnlyincludeToken(inner, config, accum);
			return str;
		}).replaceAll(/(?<=^|\0\d+e\x7F).*?(?=$|\0\d+e\x7F)/gsu, substr => {
			if (substr === '') {
				return '';
			}
			const NoincludeToken = require('../src/nowiki/noinclude');
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
	return text.replace(
		regex,
		/** @type {function(...string): string} */
		(substr, name, attr, inner, closing, include, includeAttr, includeInner, includeClosing) => {
			const str = `\0${accum.length}${name ? 'e' : 'c'}\x7F`;
			if (name) {
				const ExtToken = require('../src/tagPair/ext');
				new ExtToken(name, attr, inner, closing, config, accum);
			} else if (substr.startsWith('<!--')) {
				const CommentToken = require('../src/nowiki/comment');
				const closed = substr.endsWith('-->');
				new CommentToken(substr.slice(4, closed ? -3 : undefined), closed, config, accum);
			} else if (include) {
				const IncludeToken = require('../src/tagPair/include');
				new IncludeToken(include, includeAttr, includeInner, includeClosing, config, accum);
			} else {
				const NoincludeToken = require('../src/nowiki/noinclude');
				new NoincludeToken(substr, config, accum);
			}
			return str;
		},
	);
};

Parser.parsers.parseCommentAndExt = __filename;
module.exports = parseCommentAndExt;
