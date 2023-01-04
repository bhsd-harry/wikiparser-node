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
	 * @param {string} word 状态开关名
	 * @param {accum} accum
	 */
	constructor(word, config = Parser.getConfig(), accum = []) {
		super(word, config, accum);
		this.setAttribute('name', word.toLowerCase());
	}

	/** @override */
	cloneNode() {
		return Parser.run(() => new DoubleUnderscoreToken(this.firstChild, this.getAttribute('config')));
	}

	/**
	 * @override
	 * @this {{firstChild: string}}
	 * @param {string} selector
	 */
	toString(selector) {
		return selector && this.matches(selector) ? '' : `__${this.firstChild}__`;
	}

	/** @override */
	getPadding() {
		return 2;
	}

	/**
	 * @override
	 * @throws `Error` 禁止修改
	 */
	setText() {
		throw new Error(`禁止修改 ${this.constructor.name}！`);
	}
}

Parser.classes.DoubleUnderscoreToken = __filename;
module.exports = DoubleUnderscoreToken;
