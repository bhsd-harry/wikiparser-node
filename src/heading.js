'use strict';

const /** @type {Parser} */ Parser = require('..'),
	Token = require('.');

/**
 * 章节标题
 * @classdesc `{childNodes: [Token, HiddenToken]}`
 */
class HeadingToken extends Token {
	type = 'heading';

	/**
	 * @param {number} level
	 * @param {string[]} input
	 * @param {accum} accum
	 */
	constructor(level, input, config = Parser.getConfig(), accum = []) {
		super(undefined, config, true, accum);
		this.setAttribute('name', String(level));
		const token = new Token(input[0], config, true, accum);
		token.type = 'heading-title';
		token.setAttribute('stage', 2);
		const SyntaxToken = require('./syntax'),
			trail = new SyntaxToken(input[1], /^[^\S\n]*$/, 'heading-trail', config, accum);
		this.append(token, trail);
	}

	toString() {
		const equals = '='.repeat(Number(this.name));
		return `${equals}${this.firstElementChild.toString()}${equals}${this.lastElementChild.toString()}`;
	}

	print() {
		const equals = '='.repeat(Number(this.name));
		return super.print({pre: equals, sep: equals});
	}

	/** @returns {string} */
	text() {
		const equals = '='.repeat(Number(this.name));
		return `${equals}${this.firstElementChild.text()}${equals}`;
	}
}

module.exports = HeadingToken;
