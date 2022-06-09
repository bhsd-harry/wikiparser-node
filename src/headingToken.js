'use strict';

const {typeError} = require('../util/debug'),
	fixedToken = require('../mixin/fixedToken'),
	/** @type {Parser} */ Parser = require('..'),
	Token = require('./token'),
	AtomToken = require('./atomToken');

class HeadingToken extends fixedToken(Token) {
	type = 'heading';

	/**
	 * @param {number} level
	 * @param {string[]} input
	 * @param {accum} accum
	 */
	constructor(level, input, config = Parser.getConfig(), accum = []) {
		super(null, null, true, accum, {Token: 0, AtomToken: 1});
		this.setAttribute('name', String(level));
		const token = new Token(input[0], config, true, accum);
		token.type = 'heading-title';
		token.setAttribute('name', this.name).setAttribute('stage', 2);
		const trail = new AtomToken(input[1], 'heading-trail', accum, {
			String: ':', CommentToken: ':', NoincludeToken: ':', IncludeToken: ':',
		});
		this.append(token, trail);
	}

	toString() {
		const equals = '='.repeat(Number(this.name));
		return `${equals}${super.toString(equals)}`;
	}

	text() {
		const equals = '='.repeat(Number(this.name));
		return `${equals}${this.firstElementChild.text()}${equals}`;
	}

	/** @param {number} n */
	setLevel(n) {
		if (typeof n !== 'number') {
			typeError('Number');
		}
		n = Math.min(Math.max(n, 1), 6);
		this.setAttribute('name', String(n));
		this.firstElementChild.setAttribute('name', this.name);
	}
}

Parser.classes.HeadingToken = __filename;
module.exports = HeadingToken;
