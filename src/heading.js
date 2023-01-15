'use strict';

const {generateForSelf} = require('../util/lint'),
	Parser = require('..'),
	Token = require('.');

/**
 * 章节标题
 * @classdesc `{childNodes: [Token, SyntaxToken]}`
 */
class HeadingToken extends Token {
	type = 'heading';

	/**
	 * @param {number} level 标题层级
	 * @param {string[]} input 标题文字
	 * @param {accum} accum
	 */
	constructor(level, input, config = Parser.getConfig(), accum = []) {
		super(undefined, config, true, accum);
		this.setAttribute('name', String(level));
		const token = new Token(input[0], config, true, accum);
		token.type = 'heading-title';
		token.setAttribute('stage', 2);
		const SyntaxToken = require('./syntax');
		const trail = new SyntaxToken(input[1], 'heading-trail', config, accum);
		this.append(token, trail);
	}

	/**
	 * @override
	 * @returns {string}
	 */
	toString() {
		const equals = '='.repeat(Number(this.name));
		return `${equals}${this.firstChild.toString()}${equals}${this.lastChild.toString()}`;
	}

	/** @override */
	getPadding() {
		return Number(this.name);
	}

	/** @override */
	getGaps() {
		return Number(this.name);
	}

	/** @override */
	print() {
		const equals = '='.repeat(Number(this.name));
		return super.print({pre: equals, sep: equals});
	}

	/**
	 * @override
	 * @param {number} start 起始位置
	 */
	lint(start = 0) {
		const errors = super.lint(start);
		if (this.name === '1') {
			errors.push(generateForSelf(this, this.getRootNode().posFromIndex(start), '<h1>'));
		}
		return errors;
	}
}

module.exports = HeadingToken;
