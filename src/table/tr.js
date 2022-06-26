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
		const [syntax, attr, inner, ...cloned] = this.cloneChildren(),
			/** @type {typeof TrToken} */ Constructor = this.constructor;
		return Parser.run(() => {
			const token = new Constructor(undefined, undefined, this.getAttribute('config'));
			token.firstElementChild.safeReplaceWith(syntax);
			token.children[1].safeReplaceWith(attr);
			if (token.childElementCount > 2) { // TdToken
				token.children[2].safeReplaceWith(inner);
			} else if (inner !== undefined) {
				token.appendChild(inner);
			}
			token.append(...cloned);
			return token;
		});
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

	getRowCount() {
		const TdToken = require('./td');
		return Number(this.children.some(child => child instanceof TdToken && child.subtype !== 'caption'));
	}

	getColCount() {
		const TdToken = require('./td');
		return this.children.filter(child => child instanceof TdToken && child.subtype !== 'caption').length;
	}

	/** @param {number} n */
	getNthCol(n, insert = false) {
		if (this.type === 'td') {
			throw new Error(`${this.constructor.name}.getNthCol 方法只可用于表格或表格行！`);
		} else if (typeof n !== 'number') {
			typeError(this, 'getNthCol', 'Number');
		}
		const nCols = this.getColCount();
		n = n < 0 ? n + nCols : n;
		if (n < 0 || n > nCols || n === nCols && !insert) {
			throw new RangeError(`不存在第 ${n} 个单元格！`);
		}
		const TdToken = require('./td'); // eslint-disable-line no-unused-vars
		let /** @type {TdToken} */ nextElementSibling = this.children.find(({type}) => type === 'td'),
			isCaption = nextElementSibling?.subtype === 'caption';
		if (nextElementSibling === undefined && this.type === 'table') {
			const [,, plain] = this.children;
			return plain?.isPlain() ? this.children[3] : plain;
		}
		while (n > 0 || isCaption) {
			n -= Number(!isCaption);
			({nextElementSibling} = nextElementSibling);
			isCaption = nextElementSibling?.subtype === 'caption';
		}
		return nextElementSibling;
	}

	/**
	 * @param {string|Token} inner
	 * @param {TableCoords}
	 * @param {'td'|'th'|'caption'} subtype
	 * @param {Record<string, string|boolean>} attr
	 * @returns {TdToken}
	 */
	insertTableCell(inner, {row = 0, column}, subtype = 'td', attr = {}) {
		if (this.type === 'td') {
			throw new Error(`${this.constructor.name}.insertTableCell 方法只可用于表格或表格行！`);
		} else if (typeof inner !== 'string' && !(inner instanceof Token) || typeof attr !== 'object') {
			typeError(this, 'insertTableCell', 'String', 'Token', 'Object');
		} else if (!['td', 'th', 'caption'].includes(subtype)) {
			throw new RangeError('单元格的子类型只能为 "td"、"th" 或 "caption"！');
		}
		const TableToken = require('.'),
			rowToken = this instanceof TableToken ? this.getNthRow(row, true) : this,
			reference = rowToken.getNthCol(column, true),
			config = this.getAttribute('config');
		if (typeof inner === 'string') {
			inner = Parser.parse(inner, this.getAttribute('include'), undefined, config);
		}
		const TdToken = require('./td'),
			AttributeToken = require('../attribute'), // eslint-disable-line no-unused-vars
			/** @type {TdToken & AttributeToken}} */ token = Parser.run(() => new TdToken('\n|', undefined, config));
		token.setSyntax(subtype);
		token.lastElementChild.safeReplaceWith(inner);
		for (const [k, v] of Object.entries(attr)) {
			token.setAttr(k, v);
		}
		return rowToken.insertBefore(token, reference);
	}
}

Parser.classes.TrToken = __filename;
module.exports = TrToken;
