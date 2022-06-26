'use strict';

const /** @type {Parser} */ Parser = require('..'),
	Token = require('.');

/**
 * 嵌入时的`<onlyinclude>`
 * @classdesc `{childNodes: ...string|Token}`
 */
class OnlyincludeToken extends Token {
	type = 'onlyinclude';

	/**
	 * @param {string} inner
	 * @param {accum} accum
	 */
	constructor(inner, config = Parser.getConfig(), accum = []) {
		super(inner, config, false, accum);
	}

	cloneNode() {
		const cloned = this.cloneChildren(),
			token = Parser.run(() => new OnlyincludeToken(undefined, this.getAttribute('config')));
		token.append(...cloned);
		return token;
	}

	toString() {
		return `<onlyinclude>${super.toString()}</onlyinclude>`;
	}

	getPadding() {
		return 13;
	}

	isPlain() {
		return this.constructor === OnlyincludeToken;
	}
}

Parser.classes.OnlyincludeToken = __filename;
module.exports = OnlyincludeToken;
