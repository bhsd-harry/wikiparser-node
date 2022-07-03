'use strict';

const fixedToken = require('../mixin/fixedToken'),
	/** @type {Parser} */ Parser = require('..'),
	Token = require('.');

/**
 * 章节标题
 * @classdesc `{childNodes: [Token, HiddenToken]}`
 */
class HeadingToken extends fixedToken(Token) {
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
		token.setAttribute('name', this.name).setAttribute('stage', 2);
		const SyntaxToken = require('./syntax'),
			trail = new SyntaxToken(input[1], /^[^\S\n]*$/, 'heading-trail', config, accum, {
				'Stage-1': ':', '!ExtToken': '',
			});
		this.append(token, trail);
	}

	cloneNode() {
		const [title, trail] = this.cloneChildren(),
			token = Parser.run(() => new HeadingToken(Number(this.name), [], this.getAttribute('config')));
		token.firstElementChild.safeReplaceWith(title);
		token.lastElementChild.safeReplaceWith(trail);
		return token;
	}

	toString() {
		const equals = '='.repeat(Number(this.name)),
			{previousVisibleSibling, nextVisibleSibling} = this;
		return `${
			typeof previousVisibleSibling === 'string' && !previousVisibleSibling.endsWith('\n')
			|| previousVisibleSibling instanceof Token
				? '\n'
				: ''
		}${equals}${super.toString(equals)}${
			typeof nextVisibleSibling === 'string' && !nextVisibleSibling.startsWith('\n')
			|| nextVisibleSibling instanceof Token
				? '\n'
				: ''
		}`;
	}

	getPadding() {
		return Number(this.name);
	}

	getGaps() {
		return Number(this.name);
	}

	/** @returns {string} */
	text() {
		const equals = '='.repeat(Number(this.name));
		return `${equals}${this.firstElementChild.text()}${equals}`;
	}

	/** @returns {[number, string][]} */
	plain() {
		return this.firstElementChild.plain();
	}

	/** @param {number} n */
	setLevel(n) {
		if (typeof n !== 'number') {
			this.typeError('setLevel', 'Number');
		}
		n = Math.min(Math.max(n, 1), 6);
		this.setAttribute('name', String(n)).firstElementChild.setAttribute('name', this.name);
	}

	removeTrail() {
		this.lastElementChild.replaceChildren();
	}
}

Parser.classes.HeadingToken = __filename;
module.exports = HeadingToken;
