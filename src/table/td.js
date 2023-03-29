'use strict';

const {generateForChild} = require('../../util/lint'),
	Parser = require('../..'),
	Token = require('..'),
	TrToken = require('./tr');

/**
 * `<td>`、`<th>`和`<caption>`
 * @classdesc `{childNodes: [SyntaxToken, AttributesToken, Token]}`
 */
class TdToken extends TrToken {
	type = 'td';
	#innerSyntax = '';

	/**
	 * 单元格类型
	 * @complexity `n`
	 */
	get subtype() {
		return this.getSyntax().subtype;
	}

	/**
	 * 获取单元格语法信息
	 * @returns {{subtype: 'td'|'th'|'caption'}}
	 * @complexity `n`
	 */
	getSyntax() {
		const syntax = this.firstChild.text(),
			char = syntax.at(-1);
		let subtype = 'td';
		if (char === '!') {
			subtype = 'th';
		} else if (char === '+') {
			subtype = 'caption';
		}
		return {subtype};
	}

	/**
	 * @param {string} syntax 单元格语法
	 * @param {string} inner 内部wikitext
	 * @param {import('../../typings/token').accum} accum
	 */
	constructor(syntax, inner, config = Parser.getConfig(), accum = []) {
		let innerSyntax = inner?.match(/\||\0\d+!\x7F/u),
			attr = innerSyntax ? inner.slice(0, innerSyntax.index) : '';
		if (/\[\[|-\{/u.test(attr)) {
			innerSyntax = undefined;
			attr = '';
		}
		super(syntax, attr, config, accum);
		if (innerSyntax) {
			[this.#innerSyntax] = innerSyntax;
		}
		// eslint-disable-next-line no-unsafe-optional-chaining
		const innerToken = new Token(inner?.slice(innerSyntax?.index + this.#innerSyntax.length), config, true, accum);
		innerToken.type = 'td-inner';
		this.insertAt(innerToken.setAttribute('stage', 4));
	}

	/** @override */
	afterBuild() {
		if (this.#innerSyntax.includes('\0')) {
			this.#innerSyntax = this.getAttribute('buildFromStr')(this.#innerSyntax, 'string');
		}
	}

	/**
	 * @override
	 * @returns {string}
	 * @complexity `n`
	 */
	toString(selector) {
		const {childNodes: [syntax, attr, inner]} = this;
		return `${syntax.toString()}${attr.toString()}${this.#innerSyntax}${inner.toString()}`;
	}

	/**
	 * @override
	 * @returns {string}
	 * @complexity `n`
	 */
	text() {
		const {childNodes: [syntax, attr, inner]} = this;
		return `${syntax.text()}${attr.text()}${this.#innerSyntax}${inner.text()}`;
	}

	/**
	 * @override
	 * @param {number} i 子节点位置
	 */
	getGaps(i = 0) {
		i = i < 0 ? i + this.length : i;
		if (i === 1) {
			return this.#innerSyntax.length;
		}
		return 0;
	}

	/**
	 * @override
	 * @param {number} start 起始位置
	 */
	lint(start = this.getAbsoluteIndex()) {
		const errors = super.lint(start);
		start += this.getRelativeIndex(-1);
		for (const child of this.lastChild.childNodes) {
			if (child.type === 'text' && child.data.includes('|')) {
				errors.push(generateForChild(child, {start}, 'additional "|" in a table cell', 'warning'));
			}
		}
		return errors;
	}
}

module.exports = TdToken;
