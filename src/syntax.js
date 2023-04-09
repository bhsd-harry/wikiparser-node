'use strict';

const Parser = require('..'),
	{undo} = require('../util/debug'),
	{text} = require('../util/string'),
	Token = require('.');

/**
 * 满足特定语法格式的plain Token
 * @classdesc `{childNodes: ...AstText|Token}`
 */
class SyntaxToken extends Token {
	#pattern;

	/**
	 * @param {string} wikitext 语法wikitext
	 * @param {RegExp} pattern 语法正则
	 * @param {string} type Token.type
	 * @param {import('../typings/token').accum} accum
	 * @param {import('.').Acceptable} acceptable 可接受的子节点设置
	 * @throws `RangeError` 含有g修饰符的语法正则
	 */
	constructor(wikitext, pattern, type = 'plain', config = Parser.getConfig(), accum = [], acceptable = undefined) {
		if (pattern.global) {
			throw new RangeError(`SyntaxToken 的语法正则不能含有 g 修饰符：${pattern}`);
		}
		super(wikitext, config, true, accum, acceptable);
		this.type = type;
		this.#pattern = pattern;
	}

	/** @override */
	cloneNode() {
		const cloned = this.cloneChildNodes(),
			config = this.getAttribute('config'),
			acceptable = this.getAttribute('acceptable');
		return Parser.run(() => {
			const token = new SyntaxToken(undefined, this.#pattern, this.type, config, [], acceptable);
			token.append(...cloned);
			token.afterBuild();
			return token;
		});
	}

	/** @override */
	afterBuild() {
		const /** @type {import('../typings/event').AstListener} */ syntaxListener = (e, data) => {
			const pattern = this.#pattern;
			if (!Parser.running && !pattern.test(this.text())) {
				undo(e, data);
				Parser.error(`不可修改 ${this.constructor.name} 的语法！`, pattern);
				throw new Error(`不可修改 ${this.constructor.name} 的语法！`);
			}
		};
		this.addEventListener(['remove', 'insert', 'replace', 'text'], syntaxListener);
	}

	/**
	 * @override
	 * @template {string} T
	 * @param {T} key 属性键
	 * @returns {import('../typings/node').TokenAttribute<T>}
	 */
	getAttribute(key) {
		return key === 'pattern' ? this.#pattern : super.getAttribute(key);
	}

	/**
	 * @override
	 * @param {PropertyKey} key 属性键
	 */
	hasAttribute(key) {
		return key === 'pattern' || super.hasAttribute(key);
	}

	/**
	 * @override
	 * @param {...Token} elements 待替换的子节点
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
