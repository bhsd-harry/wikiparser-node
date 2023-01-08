'use strict';

const Parser = require('..'),
	Token = require('.');

/**
 * 嵌入时的`<onlyinclude>`
 * @classdesc `{childNodes: ...AstText|Token}`
 */
class OnlyincludeToken extends Token {
	type = 'onlyinclude';

	/**
	 * @param {string} inner 标签内部wikitext
	 * @param {accum} accum
	 */
	constructor(inner, config = Parser.getConfig(), accum = []) {
		super(inner, config, true, accum);
	}

	/** @override */
	toString() {
		return `<onlyinclude>${super.toString()}</onlyinclude>`;
	}

	/** @override */
	getPadding() {
		return 13;
	}

	/** @override */
	print() {
		return super.print({pre: '&lt;onlyinclude&gt;', post: '&lt;/onlyinclude&gt;'});
	}

	/** @override */
	isPlain() {
		return true;
	}
}

module.exports = OnlyincludeToken;
