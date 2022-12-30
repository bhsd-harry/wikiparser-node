'use strict';

const attributeParent = require('../../mixin/attributeParent'),
	/** @type {Parser} */ Parser = require('../..'),
	Token = require('..'),
	SyntaxToken = require('../syntax'),
	AttributeToken = require('../attribute');

/**
 * 表格行，含开头的换行，不含结尾的换行
 * @classdesc `{childNodes: [SyntaxToken, AttributeToken, ?Token, ...TdToken]}`
 */
class TrToken extends attributeParent(Token, 1) {
	type = 'tr';

	static openingPattern = /^\n[^\S\n]*(?:\|-+|\{\{\s*!\s*\}\}-+|\{\{\s*!-\s*\}\}-*)$/u;

	/**
	 * @param {string} syntax
	 * @param {accum} accum
	 */
	constructor(syntax, attr = '', config = Parser.getConfig(), accum = [], pattern = TrToken.openingPattern) {
		super(undefined, config, true, accum, {Token: 2, SyntaxToken: 0, AttributeToken: 1, TdToken: '2:'});
		this.append(
			new SyntaxToken(syntax, pattern, 'table-syntax', config, accum, {
				'Stage-1': ':', '!ExtToken': '', TranscludeToken: ':',
			}),
			new AttributeToken(attr, 'table-attr', 'tr', config, accum),
		);
		this.protectChildren(0, 1);
	}

	cloneNode() {
		const [syntax, attr, inner, ...cloned] = this.cloneChildren(),
			/** @type {typeof TrToken} */ {constructor: Constructor} = this;
		return Parser.run(() => {
			const token = new Constructor(undefined, undefined, this.getAttribute('config'));
			token.firstElementChild.safeReplaceWith(syntax);
			token.children[1].safeReplaceWith(attr);
			if (token.type === 'td') { // TdToken
				token.children[2].safeReplaceWith(inner);
			} else if (inner !== undefined) {
				token.appendChild(inner);
			}
			token.append(...cloned);
			return token;
		});
	}

	#correct() {
		const {children: [,, child]} = this;
		if (child?.isPlain()) {
			const {firstChild} = child;
			if (typeof firstChild !== 'string') {
				child.prepend('\n');
			} else if (!firstChild.startsWith('\n')) {
				child.setText(`\n${firstChild}`);
			}
		}
	}

	toString() {
		this.#correct();
		return super.toString();
	}

	text() {
		this.#correct();
		const str = super.text();
		return this.type === 'tr' && !str.trim().includes('\n') ? '' : str;
	}

	/** @param {SyntaxToken} syntax */
	static escape(syntax) {
		const wikitext = syntax.childNodes.map(
				child => typeof child === 'string'
					? child.replaceAll('{|', '{{(!}}').replaceAll('|}', '{{!)}}').replaceAll('||', '{{!!}}')
						.replaceAll('|', '{{!}}')
					: child.toString(),
			).join(''),
			token = Parser.parse(wikitext, syntax.getAttribute('include'), 2, syntax.getAttribute('config'));
		syntax.replaceChildren(...token.childNodes);
	}

	/** @complexity `n` */
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
	setSyntax(syntax, esc = false) {
		const {firstElementChild} = this;
		firstElementChild.replaceChildren(syntax);
		if (esc) {
			TrToken.escape(firstElementChild);
		}
	}

	/**
	 * @param {number} i
	 * @complexity `n`
	 */
	removeAt(i) {
		const TdToken = require('./td'),
			child = this.childNodes.at(i);
		if (child instanceof TdToken && child.isIndependent()) {
			const {nextElementSibling} = child;
			if (nextElementSibling?.type === 'td') {
				nextElementSibling.independence();
			}
		}
		return super.removeAt(i);
	}

	/**
	 * @template {string|Token} T
	 * @param {T} token
	 * @returns {T}
	 * @complexity `n`
	 */
	insertAt(token, i = this.childNodes.length) {
		if (!Parser.running && !(token instanceof TrToken)) {
			this.typeError('insertAt', 'TrToken');
		}
		const TdToken = require('./td'),
			child = this.childNodes.at(i);
		if (token instanceof TdToken && token.isIndependent() && child instanceof TdToken) {
			child.independence();
		}
		return super.insertAt(token, i);
	}

	/**
	 * @returns {0|1}
	 * @complexity `n`
	 */
	getRowCount() {
		const TdToken = require('./td');
		return Number(this.children.some(
			child => child instanceof TdToken && child.isIndependent() && !child.firstElementChild.text().endsWith('+'),
		));
	}

	/**
	 * @param {(children: Token[], index: number) => Token[]} subset
	 * @complexity `n`
	 */
	#getSiblingRow(subset) {
		const {parentElement} = this;
		if (!parentElement) {
			return undefined;
		}
		const {children} = parentElement,
			index = children.indexOf(this);
		for (const child of subset(children, index)) {
			if (child instanceof TrToken && child.getRowCount()) {
				return child;
			}
		}
		return undefined;
	}

	/** @complexity `n` */
	getNextRow() {
		return this.#getSiblingRow((children, index) => children.slice(index + 1));
	}

	/** @complexity `n` */
	getPreviousRow() {
		return this.#getSiblingRow((children, index) => children.slice(0, index).reverse());
	}

	/** @complexity `n` */
	getColCount() {
		const TdToken = require('./td');
		let count = 0,
			last = 0;
		for (const child of this.children) {
			if (child instanceof TdToken) {
				last = child.isIndependent() ? Number(child.subtype !== 'caption') : last;
				count += last;
			}
		}
		return count;
	}

	/**
	 * @param {number} n
	 * @returns {TdToken}
	 * @complexity `n`
	 */
	getNthCol(n, insert = false) {
		if (typeof n !== 'number') {
			this.typeError('getNthCol', 'Number');
		}
		const nCols = this.getColCount();
		n = n < 0 ? n + nCols : n;
		if (n < 0 || n > nCols || n === nCols && !insert) {
			throw new RangeError(`不存在第 ${n} 个单元格！`);
		}
		const TdToken = require('./td');
		let last = 0;
		for (const child of this.children.slice(2)) {
			if (child instanceof TdToken) {
				if (child.isIndependent()) {
					last = Number(child.subtype !== 'caption');
				}
				n -= last;
				if (n < 0) {
					return child;
				}
			} else if (child.type === 'tr' || child.type === 'table-syntax') {
				return child;
			}
		}
		return undefined;
	}

	/**
	 * @param {string|Token} inner
	 * @param {TableCoords}
	 * @param {'td'|'th'|'caption'} subtype
	 * @param {Record<string, string|boolean>} attr
	 * @returns {TdToken}
	 * @complexity `n`
	 */
	insertTableCell(inner, {column}, subtype = 'td', attr = {}) {
		const TdToken = require('./td'),
			token = TdToken.create(inner, subtype, attr, this.getAttribute('include'), this.getAttribute('config'));
		return this.insertBefore(token, this.getNthCol(column, true));
	}
}

Parser.classes.TrToken = __filename;
module.exports = TrToken;
