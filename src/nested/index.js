'use strict';

const {generateForChild} = require('../../util/lint'),
	Parser = require('../..'),
	Token = require('..'),
	ExtToken = require('../tagPair/ext'),
	NoincludeToken = require('../nowiki/noinclude');

/**
 * 嵌套式的扩展标签
 * @classdesc `{childNodes: [...ExtToken|NoincludeToken]}`
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
			/** @type {function(...string): string} */ (_, name, attr, inner, closing) => {
				const str = `\0${accum.length + 1}e\x7F`;
				new ExtToken(name, attr, inner, closing, config, accum);
				return str;
			},
		)?.replace(/(^|\0\d+e\x7F)(.*?)(?=$|\0\d+e\x7F)/gsu, (_, lead, substr) => {
			if (substr === '') {
				return lead;
			}
			new NoincludeToken(substr, config, accum);
			return `${lead}\0${accum.length}c\x7F`;
		});
		super(text, config, true, accum, {NoincludeToken: ':', ExtToken: ':'});
	}

	/**
	 * @override
	 * @param {number} start 起始位置
	 */
	lint(start = 0) {
		let rect;
		return [
			...super.lint(start),
			...this.childNodes.filter(child => {
				if (child.type === 'ext') {
					return false;
				}
				const str = String(child).trim();
				return str && !/^<!--.*-->$/u.test(str);
			}).map(child => {
				rect ||= this.getRootNode().posFromIndex(start);
				return generateForChild(child, rect, `<${this.name}>内的无效内容`);
			}),
		];
	}
}

module.exports = NestedToken;
