'use strict';

const fixedToken = require('../mixin/fixedToken'),
	sol = require('../mixin/sol'),
	/** @type {Parser} */ Parser = require('..'),
	Token = require('.');

/**
 * 章节标题
 * @classdesc `{childNodes: [Token, SyntaxToken]}`
 */
class HeadingToken extends fixedToken(sol(Token)) {
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
		const SyntaxToken = require('./syntax');
		const trail = new SyntaxToken(input[1], /^[^\S\n]*$/u, 'heading-trail', config, accum, {
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

	/** @this {HeadingToken & {prependNewLine(): ''|'\n', appendNewLine(): ''|'\n'}} */
	toString() {
		const equals = '='.repeat(Number(this.name));
		return `${this.prependNewLine()}${equals}${
			this.firstElementChild.toString()
		}${equals}${this.lastElementChild.toString()}${this.appendNewLine()}`;
	}

	getPadding() {
		return super.getPadding() + Number(this.name);
	}

	getGaps() {
		return Number(this.name);
	}

	/**
	 * @this {HeadingToken & {prependNewLine(): ''|'\n', appendNewLine(): ''|'\n'}}
	 * @returns {string}
	 */
	text() {
		const equals = '='.repeat(Number(this.name));
		return `${this.prependNewLine()}${equals}${this.firstElementChild.text()}${equals}${this.appendNewLine()}`;
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
