'use strict';

const Parser = require('..'),
	Token = require('.');

/**
 * 嵌入时的`<onlyinclude>`
 * @classdesc `{childNodes: ...AstText|Token}`
 */
class OnlyincludeToken extends Token {
	type = 'onlyinclude';

	/** 内部wikitext */
	get innerText() {
		return this.text();
	}

	/**
	 * @param {string} inner 标签内部wikitext
	 * @param {import('../typings/token').accum} accum
	 */
	constructor(inner, config = Parser.getConfig(), accum = []) {
		super(inner, config, true, accum);
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
	print() {
		return super.print({
			pre: '<span class="wpb-ext">&lt;onlyinclude&gt;</span>',
			post: '<span class="wpb-ext">&lt;/onlyinclude&gt;</span>',
		});
	}

	/** @override */
	isPlain() {
		return true;
	}

	/** @override */
	cloneNode() {
		const cloned = this.cloneChildNodes();
		return Parser.run(() => {
			const token = new OnlyincludeToken(undefined, this.getAttribute('config'));
			token.append(...cloned);
			return token;
		});
	}
}

Parser.classes.OnlyincludeToken = __filename;
module.exports = OnlyincludeToken;
