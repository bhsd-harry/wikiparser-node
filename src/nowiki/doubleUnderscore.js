'use strict';

const hidden = require('../../mixin/hidden'),
	Parser = require('../..'),
	Text = require('../../lib/text'),
	NowikiToken = require('.');

/**
 * 状态开关
 * @classdesc `{childNodes: [Text]}`
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

	/**
	 * @override
	 * @this {{firstChild: Text}}
	 */
	cloneNode() {
		return Parser.run(() => new DoubleUnderscoreToken(this.firstChild.data, this.getAttribute('config')));
	}

	/**
	 * @override
	 * @this {{firstChild: Text}}
	 * @param {string} selector
	 */
	toString(selector) {
		return selector && this.matches(selector) ? '' : `__${this.firstChild.data}__`;
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
