'use strict';

const {generateForChild} = require('../../util/lint'),
	Parser = require('../..'),
	Token = require('..');

/**
 * 嵌套式的扩展标签
 * @classdesc `{childNodes: [...ExtToken|NoincludeToken]}`
 */
class NestedToken extends Token {
	type = 'ext-inner';
	#tags;

	/**
	 * @param {string|undefined} wikitext wikitext
	 * @param {RegExp} regex 内层正则
	 * @param {string[]} tags 内层标签名
	 * @param {accum} accum
	 */
	constructor(wikitext, regex, tags, config = Parser.getConfig(), accum = []) {
		const ExtToken = require('../tagPair/ext'),
			NoincludeToken = require('../nowiki/noinclude');
		const text = wikitext?.replaceAll(
			regex,
			/** @type {function(...string): string} */ (_, name, attr, inner, closing) => {
				const str = `\0${accum.length + 1}e\x7F`;
				new ExtToken(name, attr, inner, closing, config, accum);
				return str;
			},
		)?.replaceAll(/(?<=^|\0\d+e\x7F).*?(?=$|\0\d+e\x7F)/gsu, substr => {
			if (substr === '') {
				return '';
			}
			new NoincludeToken(substr, config, accum);
			return `\0${accum.length}c\x7F`;
		});
		super(text, config, true, accum, {NoincludeToken: ':', ExtToken: ':'});
		this.#tags = tags;
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

	/**
	 * @override
	 * @template {string|Token} T
	 * @param {T} token 待插入的子节点
	 * @param {number} i 插入位置
	 */
	insertAt(token, i = this.childNodes.length) {
		return token.type === 'ext' && !this.#tags.includes(token.name)
			? this.typeError(`${this.constructor.name}只能以${this.#tags.join('或')}标签作为子节点！`)
			: super.insertAt(token, i);
	}

	/** @override */
	cloneNode() {
		const cloned = this.cloneChildNodes(),
			config = this.getAttribute('config'),
			token = Parser.run(() => new this.constructor(undefined, config));
		token.append(...cloned);
		return token;
	}
}

Parser.classes.NestedToken = __filename;
module.exports = NestedToken;
