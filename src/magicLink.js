'use strict';

const /** @type {Parser} */ Parser = require('..'),
	Token = require('.');

/**
 * 自由外链
 * @classdesc `{childNodes: [...string|CommentToken|IncludeToken|NoincludeToken]}`
 */
class MagicLinkToken extends Token {
	type = 'free-ext-link';

	/**
	 * @param {string} url
	 * @param {accum} accum
	 */
	constructor(url, doubleSlash = false, config = Parser.getConfig(), accum = []) {
		super(url, config, true, accum);
		if (doubleSlash) {
			this.type = 'ext-link-url';
		}
	}

	afterBuild() {
		const ParameterToken = require('./parameter'),
			/** @type {ParameterToken} */ parameter = this.closest('parameter');
		if (parameter?.getValue() === this.toString()) {
			this.replaceWith(this.toString());
		}
		return this;
	}
}

module.exports = MagicLinkToken;
