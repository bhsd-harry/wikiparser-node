'use strict';
const Parser = require('../index');
const Token = require('.');

/**
 * 嵌入时的`<onlyinclude>`
 * @classdesc `{childNodes: ...AstText|Token}`
 */
class OnlyincludeToken extends Token {
	/** @browser */
	type = 'onlyinclude';

	/** 内部wikitext */
	get innerText() {
		return this.text();
	}

	/**
	 * @browser
	 * @param inner 标签内部wikitext
	 */
	constructor(inner, config = Parser.getConfig(), accum = []) {
		super(inner, config, true, accum);
	}

	/**
	 * @override
	 * @browser
	 */
	toString(selector) {
		return selector && this.matches(selector) ? '' : `<onlyinclude>${super.toString(selector)}</onlyinclude>`;
	}

	/**
	 * @override
	 * @browser
	 */
	getPadding() {
		return 13;
	}

	/**
	 * @override
	 * @browser
	 */
	print() {
		return super.print({
			pre: '<span class="wpb-ext">&lt;onlyinclude&gt;</span>',
			post: '<span class="wpb-ext">&lt;/onlyinclude&gt;</span>',
		});
	}

	/**
	 * @override
	 * @browser
	 */
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
