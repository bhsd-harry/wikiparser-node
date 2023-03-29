'use strict';

const Parser = require('../..'),
	Token = require('..');

/**
 * 成对标签
 * @classdesc `{childNodes: [AstText|AttributesToken, AstText|Token]}`
 */
class TagPairToken extends Token {
	#selfClosing;
	#closed;
	#tags;

	/** getter */
	get closed() {
		return this.#closed;
	}

	/**
	 * @param {string} name 标签名
	 * @param {string|Token} attr 标签属性
	 * @param {string|Token} inner 内部wikitext
	 * @param {string|undefined} closed 是否封闭；约定`undefined`表示自闭合，`''`表示未闭合
	 * @param {import('../../typings/token').accum} accum
	 */
	constructor(name, attr, inner, closed, config = Parser.getConfig(), accum = []) {
		super(undefined, config, true);
		this.setAttribute('name', name.toLowerCase());
		this.#tags = [name, closed || name];
		this.#selfClosing = closed === undefined;
		this.#closed = closed !== '';
		this.append(attr, inner);
		let index = accum.indexOf(attr);
		if (index === -1) {
			index = accum.indexOf(inner);
		}
		if (index === -1) {
			index = Infinity;
		}
		accum.splice(index, 0, this);
	}

	/**
	 * @override
	 */
	toString(selector) {
		const {firstChild, lastChild} = this,
			[opening, closing] = this.#tags;
		return this.#selfClosing
			? `<${opening}${String(firstChild)}/>`
			: `<${opening}${String(firstChild)}>${String(lastChild)}${this.#closed ? `</${closing}>` : ''}`;
	}

	/**
	 * @override
	 * @returns {string}
	 */
	text() {
		const [opening, closing] = this.#tags;
		return this.#selfClosing
			? `<${opening}${this.firstChild.text()}/>`
			: `<${opening}${super.text('>')}${this.#closed ? `</${closing}>` : ''}`;
	}

	/** @override */
	getPadding() {
		return this.#tags[0].length + 1;
	}

	/** @override */
	getGaps() {
		return 1;
	}
}

module.exports = TagPairToken;
