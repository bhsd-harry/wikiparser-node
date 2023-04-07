'use strict';

const hidden = require('../../mixin/hidden'),
	Parser = require('../..'),
	NowikiBaseToken = require('./base');

/**
 * 状态开关
 * @classdesc `{childNodes: [AstText]}`
 */
class DoubleUnderscoreToken extends hidden(NowikiBaseToken) {
	/** @type {'double-underscore'} */ type = 'double-underscore';

	/** @override */
	getPadding() {
		return 2;
	}

	/** @override */
	print() {
		return super.print({pre: '__', post: '__'});
	}

	/**
	 * @override
	 * @param {string} selector
	 */
	toString(selector) {
		return selector && this.matches(selector) ? '' : `__${String(this.firstChild)}__`;
	}

	/**
	 * @param {string} word 状态开关名
	 * @param {import('..')[]} accum
	 */
	constructor(word, config = Parser.getConfig(), accum = []) {
		super(word, config, accum);
		this.setAttribute('name', word.toLowerCase());
	}

	/** @override */
	cloneNode() {
		return Parser.run(() => /** @type {this} */ (new DoubleUnderscoreToken(
			String(this.firstChild), this.getAttribute('config'),
		)));
	}

	/**
	 * @override
	 * @returns {never}
	 * @throws `Error` 禁止修改
	 */
	setText() {
		throw new Error(`禁止修改 ${this.constructor.name}！`);
	}
}

Parser.classes.DoubleUnderscoreToken = __filename;
module.exports = DoubleUnderscoreToken;
