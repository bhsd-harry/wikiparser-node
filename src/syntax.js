'use strict';

const {undo} = require('../util/debug'),
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
		super(wikitext, config, true, accum, acceptable);
		this.type = type;
		this.#pattern = pattern;
	}

	cloneNode() {
		const cloned = this.cloneChildren();
		Parser.running = true;
		const config = this.getAttribute('config'),
			acceptable = this.getAttribute('acceptable'),
			token = new SyntaxToken(undefined, this.#pattern, this.type, config, [], acceptable);
		token.append(...cloned);
		token.afterBuild();
		Parser.running = false;
		return token;
	}

	afterBuild() {
		const that = this,
			/** @type {AstListener} */ syntaxListener = (e, data) => {
				if (!Parser.running && !that.#pattern.test(that.text())) {
					undo(e, data);
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

	/** @returns {[number, string][]} */
	plain() {
		return [];
	}

	/** @param {...string|Token} elements */
	replaceChildren(...elements) {
		if (this.#pattern.test(elements.map(ele => typeof ele === 'string' ? ele : ele.text()).join(''))) {
			Parser.running = true;
			super.replaceChildren(...elements);
			Parser.running = false;
		}
	}
}

Parser.classes.SyntaxToken = __filename;
module.exports = SyntaxToken;
