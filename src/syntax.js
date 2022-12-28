'use strict';

const {undo} = require('../util/debug'),
	{text} = require('../util/string'),
	/** @type {Parser} */ Parser = require('..'),
	Token = require('.');

/**
 * 满足特定语法格式的plain Token
 * @classdesc `{childNodes: (string|Token)[]}`
 */
class SyntaxToken extends Token {
	#pattern;

	/**
	 * @param {?string} wikitext
	 * @param {RegExp} pattern
	 * @param {accum} accum
	 * @param {acceptable} acceptable
	 */
	constructor(wikitext, pattern, type = 'plain', config = Parser.getConfig(), accum = [], acceptable = null) {
		if (pattern.global) {
			throw new RangeError(`SyntaxToken 的语法正则不能含有 g 修饰符：${pattern}`);
		}
		super(wikitext, config, true, accum, acceptable);
		this.type = type;
		this.#pattern = pattern;
	}

	cloneNode() {
		const cloned = this.cloneChildren(),
			config = this.getAttribute('config'),
			acceptable = this.getAttribute('acceptable');
		return Parser.run(() => {
			const token = new SyntaxToken(undefined, this.#pattern, this.type, config, [], acceptable);
			token.append(...cloned);
			return token.afterBuild();
		});
	}

	afterBuild() {
		const that = this,
			/** @type {AstListener} */ syntaxListener = (e, data) => {
				const pattern = that.#pattern;
				if (!Parser.running && !pattern.test(that.text())) {
					undo(e, data);
					throw new Error(`不可修改 ${that.constructor.name} 的语法：/${pattern.source}/${pattern.flags}`);
				}
			};
		this.addEventListener(['remove', 'insert', 'replace', 'text'], syntaxListener);
		return this;
	}

	/**
	 * @template {string} T
	 * @param {T} key
	 * @returns {TokenAttribute<T>}
	 */
	getAttribute(key) {
		if (key === 'pattern') {
			return this.#pattern;
		}
		return super.getAttribute(key);
	}

	/**
	 * @param {...string|Token} elements
	 * @complexity `n`
	 */
	replaceChildren(...elements) {
		if (this.#pattern.test(text(elements))) {
			Parser.run(() => {
				super.replaceChildren(...elements);
			});
		}
	}
}

Parser.classes.SyntaxToken = __filename;
module.exports = SyntaxToken;
