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
	 * @param {?string} wikitext 语法wikitext
	 * @param {RegExp} pattern 语法正则
	 * @param {string} type Token.type
	 * @param {accum} accum
	 * @param {acceptable} acceptable 可接受的子节点设置
	 * @throws `RangeError` 含有g修饰符的语法正则
	 */
	constructor(wikitext, pattern, type = 'plain', config = Parser.getConfig(), accum = [], acceptable = null) {
		if (pattern.global) {
			throw new RangeError(`SyntaxToken 的语法正则不能含有 g 修饰符：${pattern}`);
		}
		super(wikitext, config, true, accum, acceptable);
		this.type = type;
		this.#pattern = pattern;
	}

	/** @override */
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

	/** @override */
	afterBuild() {
		const /** @type {AstListener} */ syntaxListener = (e, data) => {
			const pattern = this.#pattern;
			if (!Parser.running && !pattern.test(this.text())) {
				undo(e, data);
				Parser.error(`不可修改 ${this.constructor.name} 的语法！`, pattern);
				throw new Error(`不可修改 ${this.constructor.name} 的语法！`);
			}
		};
		this.addEventListener(['remove', 'insert', 'replace', 'text'], syntaxListener);
		return this;
	}

	/**
	 * @override
	 * @template {string} T
	 * @param {T} key 属性键
	 * @returns {TokenAttribute<T>}
	 */
	getAttribute(key) {
		if (key === 'pattern') {
			return this.#pattern;
		}
		return super.getAttribute(key);
	}

	/**
	 * @override
	 * @param {...string|Token} elements 待替换的子节点
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
