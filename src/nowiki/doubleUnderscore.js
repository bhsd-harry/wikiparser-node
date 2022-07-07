'use strict';

const hidden = require('../../mixin/hidden'),
	/** @type {Parser} */ Parser = require('../..'),
	NowikiToken = require('.');

/**
 * 状态开关
 * @classdesc `{childNodes: [string]}`
 */
class DoubleUnderscoreToken extends hidden(NowikiToken) {
	type = 'double-underscore';

	/**
	 * @param {string} word
	 * @param {accum} accum
	 */
	constructor(word, config = Parser.getConfig(), accum = []) {
		super(word, config, accum);
	}

	/** @this {DoubleUnderscoreToken & {firstChild: string}} */
	toString() {
		return `__${this.firstChild}__`;
	}

	print() {
		return super.print({pre: '__', post: '__'});
	}
}

module.exports = DoubleUnderscoreToken;
