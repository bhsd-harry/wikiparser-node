'use strict';

const {generateForChild} = require('../../util/lint'),
	attributeParent = require('../../mixin/attributeParent'),
	Parser = require('../..'),
	AstText = require('../../lib/text'),
	Token = require('..'),
	SyntaxToken = require('../syntax');

const openingPattern = /^\n[^\S\n]*(?:\|-+|\{\{\s*!\s*\}\}-+|\{\{\s*!-\s*\}\}-*)$/u;

/**
 * 转义表格语法
 * @param {SyntaxToken} syntax 表格语法节点
 */
const escapeTable = syntax => {
	const templates = {'{|': '(!', '|}': '!)', '||': '!!', '|': '!'},
		wikitext = syntax.childNodes.map(
			child => child.type === 'text'
				? String(child).replaceAll(/\{\||\|\}|\|{2}|\|/gu, p => `{{${templates[p]}}}`)
				: String(child),
		).join(''),
		token = Parser.parse(wikitext, syntax.getAttribute('include'), 2, syntax.getAttribute('config'));
	syntax.replaceChildren(...token.childNodes);
};

/**
 * 表格行，含开头的换行，不含结尾的换行
 * @classdesc `{childNodes: [SyntaxToken, AttributeToken, ?Token, ...TdToken]}`
 */
class TrToken extends attributeParent(Token, 1) {
	type = 'tr';

	/**
	 * @param {string} syntax 表格语法
	 * @param {string} attr 表格属性
	 * @param {accum} accum
	 * @param {RegExp} pattern 表格语法正则
	 */
	constructor(syntax, attr = '', config = Parser.getConfig(), accum = [], pattern = openingPattern) {
		super(undefined, config, true, accum, {Token: 2, SyntaxToken: 0, AttributeToken: 1, TdToken: '2:'});
		const AttributeToken = require('../attribute');
		this.append(
			new SyntaxToken(syntax, pattern, 'table-syntax', config, accum, {
				'Stage-1': ':', '!ExtToken': '', TranscludeToken: ':',
			}),
			new AttributeToken(attr, 'table-attr', 'tr', config, accum),
		);
		this.getAttribute('protectChildren')(0, 1);
	}

	/**
	 * @override
	 * @param {number} start 起始位置
	 */
	lint(start = 0) {
		const errors = super.lint(start),
			inter = this.childNodes.find(({type}) => type === 'table-inter'),
			str = String(inter).trim();
		if (inter && str && !/^<!--.*-->$/su.test(str)) {
			const error = generateForChild(inter, this.getRootNode().posFromIndex(start), '将被移出表格的内容');
			error.startLine++;
			error.startCol = 0;
			errors.push(error);
		}
		return errors;
	}

	/**
	 * @override
	 * @this {TrToken & {constructor: typeof TrToken}}
	 */
	cloneNode() {
		const [syntax, attr, inner, ...cloned] = this.cloneChildNodes();
		return Parser.run(() => {
			const token = new this.constructor(undefined, undefined, this.getAttribute('config'));
			token.firstChild.safeReplaceWith(syntax);
			token.childNodes[1].safeReplaceWith(attr);
			if (token.type === 'td') { // TdToken
				token.childNodes[2].safeReplaceWith(inner);
			} else if (inner !== undefined) {
				token.insertAt(inner);
			}
			token.append(...cloned);
			return token;
		});
	}

	/** 修复简单的表格语法错误 */
	#correct() {
		const {childNodes: [,, child]} = this;
		if (child?.constructor === Token) {
			const /** @type {{firstChild: AstText}} */ {firstChild} = child;
			if (firstChild.type !== 'text') {
				child.prepend('\n');
			} else if (firstChild.data[0] !== '\n') {
				firstChild.insertData(0, '\n');
			}
		}
	}

	/**
	 * @override
	 * @param {string} selector
	 */
	toString(selector) {
		this.#correct();
		return super.toString(selector);
	}

	/** @override */
	text() {
		this.#correct();
		const str = super.text();
		return this.type === 'tr' && !str.trim().includes('\n') ? '' : str;
	}

	/**
	 * 转义表格语法
	 * @complexity `n`
	 */
	escape() {
		for (const child of this.childNodes) {
			if (child instanceof SyntaxToken) {
				escapeTable(child);
			} else if (child instanceof TrToken) {
				child.escape();
			}
		}
	}

	/**
	 * 设置表格语法
	 * @param {string} syntax 表格语法
	 * @param {boolean} esc 是否需要转义
	 */
	setSyntax(syntax, esc) {
		const {firstChild} = this;
		firstChild.replaceChildren(syntax);
		if (esc) {
			escapeTable(firstChild);
		}
	}

	/**
	 * @override
	 * @param {number} i 移除位置
	 * @complexity `n`
	 */
	removeAt(i) {
		const TdToken = require('./td');
		const child = this.childNodes.at(i);
		if (child instanceof TdToken && child.isIndependent()) {
			const {nextSibling} = child;
			if (nextSibling?.type === 'td') {
				nextSibling.independence();
			}
		}
		return super.removeAt(i);
	}

	/**
	 * @override
	 * @template {AstText|Token} T
	 * @param {T} token 待插入的子节点
	 * @param {number} i 插入位置
	 * @returns {T}
	 * @complexity `n`
	 */
	insertAt(token, i = this.childNodes.length) {
		if (!Parser.running && !(token instanceof TrToken)) {
			this.typeError('insertAt', 'TrToken');
		}
		const TdToken = require('./td');
		const child = this.childNodes.at(i);
		if (token instanceof TdToken && token.isIndependent() && child instanceof TdToken) {
			child.independence();
		}
		return super.insertAt(token, i);
	}

	/**
	 * 获取行数
	 * @returns {0|1}
	 * @complexity `n`
	 */
	getRowCount() {
		const TdToken = require('./td');
		return Number(this.childNodes.some(
			child => child instanceof TdToken && child.isIndependent() && child.firstChild.text().at(-1) !== '+',
		));
	}

	/**
	 * 获取相邻行
	 * @param {(childNodes: Token[], index: number) => Token[]} subset 筛选兄弟节点的方法
	 * @complexity `n`
	 */
	#getSiblingRow(subset) {
		const {parentNode} = this;
		if (!parentNode) {
			return undefined;
		}
		const {childNodes} = parentNode,
			index = childNodes.indexOf(this);
		for (const child of subset(childNodes, index)) {
			if (child instanceof TrToken && child.getRowCount()) {
				return child;
			}
		}
		return undefined;
	}

	/**
	 * 获取下一行
	 * @complexity `n`
	 */
	getNextRow() {
		return this.#getSiblingRow((childNodes, index) => childNodes.slice(index + 1));
	}

	/**
	 * 获取前一行
	 * @complexity `n`
	 */
	getPreviousRow() {
		return this.#getSiblingRow((childNodes, index) => childNodes.slice(0, index).reverse());
	}

	/**
	 * 获取列数
	 * @complexity `n`
	 */
	getColCount() {
		const TdToken = require('./td');
		let count = 0,
			last = 0;
		for (const child of this.childNodes) {
			if (child instanceof TdToken) {
				last = child.isIndependent() ? Number(child.subtype !== 'caption') : last;
				count += last;
			}
		}
		return count;
	}

	/**
	 * 获取第n列
	 * @param {number} n 列号
	 * @param {boolean} insert 是否用于判断插入新列的位置
	 * @returns {TdToken}
	 * @complexity `n`
	 * @throws `RangeError` 不存在对应单元格
	 */
	getNthCol(n, insert) {
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
		for (const child of this.childNodes.slice(2)) {
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
	 * 插入新的单元格
	 * @param {string|Token} inner 单元格内部wikitext
	 * @param {TableCoords} coord 单元格坐标
	 * @param {'td'|'th'|'caption'} subtype 单元格类型
	 * @param {Record<string, string|boolean>} attr 单元格属性
	 * @returns {TdToken}
	 * @complexity `n`
	 */
	insertTableCell(inner, {column}, subtype = 'td', attr = {}) {
		const TdToken = require('./td');
		const token = TdToken.create(inner, subtype, attr, this.getAttribute('include'), this.getAttribute('config'));
		return this.insertBefore(token, this.getNthCol(column, true));
	}
}

Parser.classes.TrToken = __filename;
module.exports = TrToken;
