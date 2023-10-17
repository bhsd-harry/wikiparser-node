'use strict';
const hidden = require('../../mixin/hidden');
const Parser = require('../../index');
const NowikiBaseToken = require('./base');

/** 状态开关 */
class DoubleUnderscoreToken extends hidden(NowikiBaseToken) {
	/** @browser */
	type = 'double-underscore';
	/** @private */
	getPadding() {
		return 2;
	}

	/**
	 * @override
	 * @browser
	 */
	print() {
		return super.print({pre: '__', post: '__'});
	}

	/**
	 * @override
	 * @browser
	 */
	toString(selector) {
		return selector && this.matches(selector) ? '' : `__${this.firstChild.data}__`;
	}

	/** @param word 状态开关名 */
	constructor(word, config = Parser.getConfig(), accum = []) {
		super(word, config, accum);
		this.setAttribute('name', word.toLowerCase());
	}

	/** @override */
	cloneNode() {
		return Parser.run(() => new DoubleUnderscoreToken(this.firstChild.data, this.getAttribute('config')));
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
