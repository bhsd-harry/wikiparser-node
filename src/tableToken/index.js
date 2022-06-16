'use strict';

const {externalUse, typeError} = require('../../util/debug'),
	attributeParent = require('../../mixin/attributeParent'),
	/** @type {Parser} */ Parser = require('../..'),
	Token = require('../token');

/**
 * 表格及其子元素
 * @classdesc `{childNodes: [AttributeToken, ?(string|Token), ...TableToken]}`
 */
class TableToken extends attributeParent(Token) {
	#syntax;
	#closing = '';

	/**
	 * @param {'table'|'tr'|'td'} type
	 * @param {string} syntax
	 * @param {accum} accum
	 */
	constructor(type, syntax, attr = '', config = Parser.getConfig(), accum = []) {
		super(undefined, config, true, accum, {
			String: 1, Token: 1, AttributeToken: 0, TableToken: '1:', TdToken: '1:',
		});
		this.type = type;
		this.#syntax = syntax;
		const AttributeToken = require('../attributeToken');
		this.appendChild(new AttributeToken(attr, 'table-attr', type, accum));
		this.protectChildren(0);
	}

	/**
	 * @template {TokenAttributeName} T
	 * @param {T} key
	 * @returns {TokenAttribute<T>}
	 */
	getAttribute(key) {
		if (key === 'syntax') {
			return this.#syntax;
		} else if (key === 'closing') {
			return this.#closing;
		}
		return super.getAttribute(key);
	}

	/**
	 * @template {TokenAttributeName} T
	 * @param {T} key
	 * @param {TokenAttribute<T>} value
	 */
	setAttribute(key, value) {
		if (!Parser.debugging && ['syntax', 'closing'].includes(key) && externalUse('setAttribute')) {
			throw new RangeError(`使用 ${this.constructor.name}.setAttribute 方法设置私有属性 ${key} 仅用于代码调试！`);
		} else if (key === 'syntax') {
			this.#syntax = String(value);
		} else if (key === 'closing' && this.type === 'table') {
			this.#closing = String(value);
		} else {
			super.setAttribute(key, value);
		}
		return this;
	}

	build() {
		if (this.#syntax.includes('\x00')) {
			this.#syntax = this.buildFromStr(this.#syntax).map(String).join('');
		}
		if (this.#closing.includes('\x00')) {
			this.#closing = this.buildFromStr(this.#closing).map(String).join('');
		}
		return super.build();
	}

	toString(separator = '\n') {
		if (this.type === 'table' && !this.#closing && this.nextSibling) {
			Parser.error('自动闭合表格');
			this.#closing = this.#syntax === '{|' ? '|}' : '{{!}}}';
		}
		return `${this.#syntax}${this.firstElementChild.toString()}${separator}${
			this.childNodes.slice(1).map(String).join('')
		}${this.#closing}`;
	}

	getPadding() {
		return this.#syntax.length;
	}

	/** @type {number} i */
	getGaps(i) {
		return i ? 0 : 1;
	}

	text(separator = '\n') {
		return `${this.#syntax.replace(/-+$/, '-')}${this.firstElementChild.toString()}${separator}${
			this.childNodes.slice(1).map(child => typeof child === 'string' ? child : child.text()).join('')
		}${this.#closing}`;
	}

	escape() {
		this.#syntax = this.#syntax.replaceAll('|', '{{!}}');
		this.#closing = this.#closing.replaceAll('|', '{{!}}');
		for (const child of this.children) {
			if (child instanceof TableToken) {
				child.escape();
			}
		}
	}

	/**
	 * @param {TdToken} td
	 * @param {'afterbegin'|'beforeend'} position
	 */
	insertTableCell(td, position = 'beforeend') {
		if (this.type === 'td') {
			throw new Error('只能在表格或表格行插入新的单元格！');
		} else if (!['afterbegin', 'beforeend'].includes(position)) {
			throw new RangeError('插入位置只能选择"afterbegin"或"beforeend"！');
		} else if (position === 'beforeend' && this.type === 'table') {
			const {lastChild} = this;
			if (lastChild instanceof TableToken && lastChild.type === 'tr') {
				throw new Error('当前不能将单元格直接插入表格，请插入某一表格行。');
			}
		}
		const TdToken = require('./tdToken');
		if (!(td instanceof TdToken)) {
			typeError('TdToken');
		} else if (!td.toString().endsWith('\n')) {
			const {lastElementChild} = td;
			lastElementChild.appendChild('\n');
			lastElementChild.normalize();
		}
		if (position === 'beforeend') {
			return this.insertAt(td);
		}
		const [, child] = this.childNodes;
		return this.insertAt(td, child !== undefined && !(child instanceof TableToken) ? 2 : 1);
	}

	/**
	 * @param {'td'|'th'|'caption'}
	 * @param {string} attr
	 * @param {string|Token|(string|Token)[]} inner
	 * @param {'afterbegin'|'beforeend'} position
	 */
	newTableCell(subtype, attr, inner, position = 'beforeend') {
		if (!['td', 'th', 'caption'].includes(subtype)) {
			throw new RangeError('单元格的子类型只能为"td"、"th"或"caption"！');
		} else if (typeof attr !== 'string') {
			typeError('String');
		}
		const TdToken = require('./tdToken'),
			syntaxes = {td: '|', th: '!', caption: '|+'},
			td = new TdToken(syntaxes[subtype], `${attr}${attr && '|'}`, this.getAttribute('config'));
		td.lastElementChild.append(...Array.isArray(inner) ? inner : [inner]);
		return this.insertTableCell(td, position);
	}

	/**
	 * @param {string|TableToken} attr
	 * @returns {TableToken}
	 */
	insertTableRow(attr, i = this.childNodes.length) {
		if (typeof attr !== 'string' && !(attr instanceof TableToken && attr.type === 'tr')) {
			typeError('String', 'TableToken');
		} else if (typeof i !== 'number') {
			typeError('Number');
		} else if (this.type !== 'table') {
			throw new Error('只能在表格内插入新行！');
		}
		const child = this.childNodes[i];
		if (!(child instanceof TableToken) || child.type === 'td') {
			throw new RangeError(`不能在第 ${i} 个位置处插入新行！`);
		} else if (typeof attr === 'string') {
			attr = new TableToken('tr', '|-', attr, this.getAttribute('config'));
		}
		return this.insertAt(attr, i);
	}
}

Parser.classes.TableToken = __filename;
module.exports = TableToken;
