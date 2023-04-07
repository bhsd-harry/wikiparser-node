'use strict';
const Parser = require('../index');
const debug_1 = require('../util/debug');
const {undo} = debug_1;
const string_1 = require('../util/string');
const {text} = string_1;
const Token = require('.');

/** 满足特定语法格式的plain Token */
class SyntaxToken extends Token {
	#pattern;

	/**
	 * @browser
	 * @param pattern 语法正则
	 * @throws `RangeError` 含有g修饰符的语法正则
	 */
	constructor(wikitext, pattern, type = 'plain', config = Parser.getConfig(), accum = [], acceptable) {
		if (pattern.global) {
			throw new RangeError(`SyntaxToken 的语法正则不能含有 g 修饰符：${String(pattern)}`);
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

	/** @private */
	afterBuild() {
		const /** @implements */ syntaxListener = (e, data) => {
			const pattern = this.#pattern;
			if (!Parser.running && !pattern.test(this.text())) {
				undo(e, data);
				Parser.error(`不可修改 ${this.constructor.name} 的语法！`, pattern);
				throw new Error(`不可修改 ${this.constructor.name} 的语法！`);
			}
		};
		this.addEventListener(['remove', 'insert', 'replace', 'text'], syntaxListener);
	}

	/** @private */
	getAttribute(key) {
		return key === 'pattern' ? this.#pattern : super.getAttribute(key);
	}

	/** @private */
	hasAttribute(key) {
		return key === 'pattern' || super.hasAttribute(key);
	}

	/**
	 * @override
	 * @param elements 待替换的子节点
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
