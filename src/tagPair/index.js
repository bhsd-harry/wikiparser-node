'use strict';

const /** @type {Parser} */ Parser = require('../..'),
	Token = require('..');

/**
 * 成对标签
 * @classdesc `{childNodes: [string|AttributeToken, string|Token]}`
 */
class TagPairToken extends Token {
	selfClosing;
	closed;
	#tags;

	/**
	 * @param {string} name
	 * @param {string|Token} attr
	 * @param {string|Token} inner
	 * @param {string|undefined} closing - 约定`undefined`表示自闭合，`''`表示未闭合
	 * @param {accum} accum
	 */
	constructor(name, attr, inner, closing, config = Parser.getConfig(), accum = []) {
		super(undefined, config, true);
		this.#tags = [name, closing || name];
		this.selfClosing = closing === undefined;
		this.closed = closing !== '';
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

	toString() {
		const {closed, selfClosing} = this,
			[opening, closing] = this.#tags;
		return selfClosing
			? `<${opening}${String(firstChild)}/>`
			: `<${opening}${String(firstChild)}>${String(lastChild)}${this.closed ? `</${closing}>` : ''}`;
	}

	print() {
		const {closed, selfClosing} = this,
			[opening, closing] = this.#tags;
		return selfClosing
			? super.print({pre: `&lt;${opening}`, post: '/&gt;'})
			: super.print({pre: `&lt;${opening}`, sep: '&gt;', post: closed ? `&lt;/${closing}&gt;` : ''});
	}

	/** @returns {string} */
	text() {
		const {closed, firstChild, selfClosing} = this,
			[opening, closing] = this.#tags;
		return selfClosing
			? `<${opening}${typeof firstChild === 'string' ? firstChild : firstChild.text()}/>`
			: `<${opening}${super.text('>')}${closed ? `</${closing}>` : ''}`;
	}
}

module.exports = TagPairToken;
