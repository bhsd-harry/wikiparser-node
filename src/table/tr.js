'use strict';

const attributeParent = require('../../mixin/attributeParent'),
	{typeError} = require('../../util/debug'),
	/** @type {Parser} */ Parser = require('../..'),
	Token = require('..'),
	SyntaxToken = require('../syntax');

/**
 * 表格行，含开头的换行，不含结尾的换行
 * @classdesc `{childNodes: [SyntaxToken, AttributeToken, ?(string|Token), ...TdToken]}`
 */
class TrToken extends attributeParent(Token, 1) {
	type = 'tr';

	static openingPattern = /^\n[^\S\n]*(?:\|-+|{{\s*!\s*}}-+|{{\s*!-\s*}}-*)$/;

	/**
	 * @param {string} syntax
	 * @param {accum} accum
	 */
	constructor(syntax, attr = '', config = Parser.getConfig(), accum = [], pattern = TrToken.openingPattern) {
		super(undefined, config, true, accum, {String: 2, Token: 2, SyntaxToken: 0, AttributeToken: 1, TdToken: '2:'});
		const AttributeToken = require('../attribute');
		this.append(
			new SyntaxToken(syntax, pattern, 'table-syntax', config, accum, {
				'Stage-1': ':', '!ExtToken': '', TranscludeToken: ':',
			}),
			new AttributeToken(attr, 'table-attr', 'tr', config, accum),
		);
		this.protectChildren(0, 1);
	}

	cloneNode() {
		const [syntax, attr, inner, ...cloned] = this.cloneChildren();
		Parser.running = true;
		const /** @type {typeof TrToken} */ Constructor = this.constructor,
			token = new Constructor(undefined, undefined, this.getAttribute('config'));
		token.firstElementChild.safeReplaceWith(syntax);
		token.children[1].safeReplaceWith(attr);
		if (token.childElementCount > 2) { // TdToken
			token.children[2].safeReplaceWith(inner);
		} else if (inner !== undefined) {
			token.appendChild(inner);
		}
		token.append(...cloned);
		Parser.running = false;
		return token;
	}

	#correct() {
		const [,, child] = this.childNodes;
		if (typeof child === 'string' && !child.startsWith('\n')) {
			this.setText(`\n${child}`, 2);
		} else if (typeof child !== 'string' && child?.isPlain()) {
			const {firstChild} = child;
			if (typeof firstChild !== 'string') {
				child.prepend('\n');
			} else if (!firstChild.startsWith('\n')) {
				child.setText(`\n${firstChild}`, 0);
			}
		}
	}

	toString() {
		this.#correct();
		return super.toString();
	}

	text() {
		this.#correct();
		return super.text();
	}

	/** @param {SyntaxToken} syntax */
	static escape(syntax) {
		if (!(syntax instanceof SyntaxToken)) {
			typeError('SyntaxToken');
		}
		const wikitext = syntax.childNodes.map(child => typeof child === 'string'
				? child.replaceAll('{|', '{{(!}}').replaceAll('|}', '{{!)}}').replaceAll('||', '{{!!}}')
					.replaceAll('|', '{{!}}')
				: child.toString(),
			).join(''),
			token = Parser.parse(wikitext, syntax.getAttribute('include'), 2, syntax.getAttribute('config'));
		syntax.replaceChildren(...token.childNodes);
	}

	escape() {
		for (const child of this.children) {
			if (child instanceof SyntaxToken) {
				TrToken.escape(child);
			} else if (child instanceof TrToken) {
				child.escape();
			}
		}
	}

	/** @param {string} syntax */
	setSyntax(syntax, escape = false) {
		const {firstElementChild} = this;
		firstElementChild.replaceChildren(syntax);
		if (escape) {
			TrToken.escape(firstElementChild);
		}
	}

	/** @param {number} i */
	removeAt(i) {
		const TdToken = require('./td'),
			child = this.childNodes.at(i);
		if (child instanceof TdToken && child.isIndependent()) {
			const {nextElementSibling} = child;
			if (nextElementSibling.type === 'td') {
				nextElementSibling.independence();
			}
		}
		return super.removeAt(i);
	}

	/**
	 * @template {string|Token} T
	 * @param {T} token
	 */
	insertAt(token, i = this.childNodes.length) {
		if (!Parser.running && !(token instanceof TrToken)) {
			typeError(this, 'insertAt', 'TrToken');
		}
		const TdToken = require('./td'),
			child = this.childNodes.at(i);
		if (token instanceof TdToken && token.isIndependent() && child instanceof TdToken) {
			child.independence();
		}
		return super.insertAt(token, i);
	}
}

Parser.classes.TrToken = __filename;
module.exports = TrToken;
