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
		this.setAttribute('name', word.toLowerCase());
	}

	cloneNode() {
		Parser.running = true;
		const token = new DoubleUnderscoreToken(this.firstChild, this.getAttribute('config'));
		Parser.running = false;
		return token;
	}

	/** @this {DoubleUnderscoreToken & {firstChild: string}} */
	toString() {
		return `__${this.firstChild}__`;
	}

	getPadding() {
		return 2;
	}

	setText() {
		throw new Error(`禁止修改 ${this.constructor.name}！`);
	}
}

Parser.classes.DoubleUnderscoreToken = __filename;
module.exports = DoubleUnderscoreToken;
