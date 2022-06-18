'use strict';

const /** @type {Parser} */ Parser = require('..');

/**
 * @param {string} text
 * @param {accum} accum
 */
const parseCommentAndExt = (text, config = Parser.getConfig(), accum = [], includeOnly = false) => {
	const onlyinclude = /<onlyinclude>(.*?)<\/onlyinclude>/gs;
	if (includeOnly && onlyinclude.test(text)) { // `<onlyinclude>`拥有最高优先级
		return text.replace(onlyinclude, /** @param {string} inner */ (_, inner) => {
			const str = `\x00${accum.length}e\x7f`,
				OnlyincludeToken = require('../src/onlyinclude');
			new OnlyincludeToken(inner, config, accum);
			return str;
		}).replace(/(?<=^|\x00\d+e\x7f).*?(?=$|\x00\d+e\x7f)/gs, substr => {
			if (substr === '') {
				return '';
			}
			const NoincludeToken = require('../src/nowiki/noinclude');
			new NoincludeToken(substr, accum);
			return `\x00${accum.length - 1}c\x7f`;
		});
	}
	const ext = config.ext.join('|'),
		includeRegex = includeOnly ? 'includeonly' : '(?:no|only)include',
		noincludeRegex = includeOnly ? 'noinclude' : 'includeonly',
		regex = new RegExp(
			'<!--.*?(?:-->|$)|' // comment
				+ `<${includeRegex}(?:\\s.*?)?>|</${includeRegex}\\s*>|` // <includeonly>
				+ `<(${ext})(\\s.*?)?(?:/>|>(.*?)</(\\1\\s*)>)|` // 扩展标签
				+ `<(${noincludeRegex})(\\s.*?)?(?:/>|>(.*?)(?:</(\\5\\s*)>|$))`, // <noinclude>
			'gis',
		);
	return text.replace(
		regex,
		/** @type {function(...string): string} */
		(substr, name, attr, inner, closing, include, includeAttr, includeInner, includeClosing) => {
			const str = `\x00${accum.length}${name ? 'e' : 'c'}\x7f`;
			if (name) {
				const ExtToken = require('../src/tagPair/ext');
				new ExtToken(name, attr, inner, closing, config, accum);
			} else if (substr.startsWith('<!--')) {
				const CommentToken = require('../src/nowiki/comment'),
					closed = substr.endsWith('-->');
				new CommentToken(substr.slice(4, closed ? -3 : undefined), closed, accum);
			} else if (include) {
				const IncludeToken = require('../src/tagPair/include');
				new IncludeToken(include, includeAttr, includeInner, includeClosing, accum);
			} else {
				const NoincludeToken = require('../src/nowiki/noinclude');
				new NoincludeToken(substr, accum);
			}
			return str;
		},
	);
};

Parser.parsers.parseCommentAndExt = __filename;
module.exports = parseCommentAndExt;
