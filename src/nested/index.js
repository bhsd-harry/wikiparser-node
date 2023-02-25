'use strict';

const {generateForChild} = require('../../util/lint'),
	Parser = require('../..'),
	Token = require('..'),
	ExtToken = require('../tagPair/ext'),
	NoincludeToken = require('../nowiki/noinclude'),
	CommentToken = require('../nowiki/comment');

/**
 * 嵌套式的扩展标签
 * @classdesc `{childNodes: [...ExtToken|NoincludeToken|CommentToken]}`
 */
class NestedToken extends Token {
	type = 'ext-inner';

	/**
	 * @param {string|undefined} wikitext wikitext
	 * @param {RegExp} regex 内层正则
	 * @param {string[]} tags 内层标签名
	 * @param {accum} accum
	 */
	constructor(wikitext, regex, tags, config = Parser.getConfig(), accum = []) {
		const text = wikitext?.replace(
			regex,
			/** @type {function(...string): string} */ (comment, name, attr, inner, closing) => {
				const str = `\0${accum.length + 1}${name ? 'e' : 'c'}\x7F`;
				if (name) {
					new ExtToken(name, attr, inner, closing, config, accum);
				} else {
					const closed = comment.endsWith('-->');
					new CommentToken(comment.slice(4, closed ? -3 : undefined), closed, config, accum);
				}
				return str;
			},
		)?.replace(/(?<=^|\0\d+[ce]\x7F)[^\0]+(?=$|\0\d+[ce]\x7F)/gu, substr => {
			new NoincludeToken(substr, config, accum);
			return `\0${accum.length}c\x7F`;
		});
		super(text, config, true, accum, {
		});
	}

	/**
	 * @override
	 * @param {number} start 起始位置
	 */
	lint(start = this.getAbsoluteIndex()) {
		let rect;
		return [
			...super.lint(start),
			...this.childNodes.filter(child => {
				if (child.type === 'ext' || child.type === 'comment') {
					return false;
				}
				const str = String(child).trim();
				return str && !/^<!--.*-->$/u.test(str);
			}).map(child => {
				rect ||= {start, ...this.getRootNode().posFromIndex(start)};
				return generateForChild(child, rect, Parser.msg('invalid content in <$1>', this.name));
			}),
		];
	}
}

module.exports = NestedToken;
