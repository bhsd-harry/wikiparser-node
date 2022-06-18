'use strict';

const {typeError} = require('../util/debug'),
	fixedToken = require('../mixin/fixedToken'),
	/** @type {Parser} */ Parser = require('..'),
	Token = require('.');

/**
 * 章节标题
 * @classdesc `{childNodes: [Token, AtomToken]}`
 */
class HeadingToken extends fixedToken(Token) {
	type = 'heading';

	/**
	 * @param {number} level
	 * @param {string[]} input
	 * @param {accum} accum
	 */
	constructor(level, input, config = Parser.getConfig(), accum = []) {
		super(undefined, null, true, accum);
		this.setAttribute('name', String(level));
		const token = new Token(input[0], config, true, accum);
		token.type = 'heading-title';
		token.setAttribute('name', this.name).setAttribute('stage', 2);
		const AtomToken = require('./atomToken'),
			trail = new AtomToken(input[1], 'heading-trail', accum, {'Stage-1': ':', '!ExtToken': ''});
		this.append(token, trail);
	}

	toString() {
		const equals = '='.repeat(Number(this.name));
		return `${equals}${super.toString(equals)}`;
	}

	getPadding() {
		return Number(this.name);
	}

	getGaps() {
		return Number(this.name);
	}

	text() {
		const equals = '='.repeat(Number(this.name));
		return `${equals}${this.firstElementChild.text()}${equals}`;
	}

	plain() {
		return this.firstElementChild.plain();
	}

	/** @param {number} n */
	setLevel(n) {
		if (typeof n !== 'number') {
			typeError('Number');
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
