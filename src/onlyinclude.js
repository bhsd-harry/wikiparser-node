'use strict';

const Parser = require('..'),
	Token = require('.');

/**
 * 嵌入时的`<onlyinclude>`
 * @classdesc `{childNodes: ...string|Token}`
 */
class OnlyincludeToken extends Token {
	type = 'onlyinclude';

	/** 内部wikitext */
	get innerText() {
		return this.text();
	}

	/**
	 * @param {string} inner 标签内部wikitext
	 * @param {accum} accum
	 */
	constructor(inner, config = Parser.getConfig(), accum = []) {
		super(inner, config, true, accum);
	}

	/** @override */
	cloneNode() {
		const cloned = this.cloneChildren(),
			token = Parser.run(() => new OnlyincludeToken(undefined, this.getAttribute('config')));
		token.append(...cloned);
		return token;
	}

	/**
	 * @override
	 * @param {string} selector
	 */
	toString(selector) {
		return selector && this.matches(selector) ? '' : `<onlyinclude>${super.toString(selector)}</onlyinclude>`;
	}

	/** @override */
	getPadding() {
		return 13;
	}

	/** @override */
	isPlain() {
		return this.constructor === OnlyincludeToken;
	}
}

Parser.classes.OnlyincludeToken = __filename;
module.exports = OnlyincludeToken;
