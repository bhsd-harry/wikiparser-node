'use strict';

const {generateForChild} = require('../util/lint'),
	Parser = require('..'),
	Token = require('.');

/**
 * `<references>`
 * @classdesc `{childNodes: [...ExtToken|NoincludeToken]}`
 */
class ReferencesToken extends Token {
	type = 'ext-inner';
	name = 'references';

	/**
	 * @param {string|undefined} wikitext wikitext
	 * @param {accum} accum
	 */
	constructor(wikitext, config = Parser.getConfig(), accum = []) {
		const ExtToken = require('./tagPair/ext'),
			NoincludeToken = require('../src/nowiki/noinclude');
		const regex = /<(ref)(\s[^>]*?)?(?:\/>|>(.*?)<\/(ref\s*)>)/giu,
			text = wikitext?.replaceAll(
				regex,
				/** @type {function(...string): string} */ (_, name, attr, inner, closing) => {
					const str = `\0${accum.length + 1}e\x7F`;
					new ExtToken(name, attr, inner, closing, config, accum);
					return str;
				},
			)?.replaceAll(/(^|\0\d+e\x7F)(.*?)(?=$|\0\d+e\x7F)/gsu, (_, lead, substr) => {
				if (substr === '') {
					return lead;
				}
				new NoincludeToken(substr, config, accum);
				return `${lead}\0${accum.length}c\x7F`;
			});
		super(text, config, true, accum);
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
				return generateForChild(child, rect, '<references>内的无效内容');
			}),
		];
	}
}

Parser.classes.ReferencesToken = __filename;
module.exports = ReferencesToken;
