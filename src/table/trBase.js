'use strict';
const lint_1 = require('../../util/lint');
const {generateForChild} = lint_1;
const Parser = require('../../index');
const Token = require('..');
const TableBaseToken = require('./base');
const TdToken = require('./td');

/** 表格行或表格 */
class TrBaseToken extends TableBaseToken {
	/**
	 * @override
	 * @browser
	 */
	lint(start = this.getAbsoluteIndex()) {
		const errors = super.lint(start),
			inter = this.childNodes.find(({type}) => type === 'table-inter');
		if (!inter) {
			return errors;
		}
		const first = inter.childNodes.find(child => child.text().trim()),
			tdPattern = /^\s*(?:!|\{\{\s*![!-]?\s*\}\})/u;
		if (!first || tdPattern.test(String(first))
            || first.type === 'arg' && tdPattern.test(first.default || '')) {
			return errors;
		} else if (first.type === 'magic-word') {
			try {
				const possibleValues = first.getPossibleValues();
				if (possibleValues.every(token => tdPattern.test(token.text()))) {
					return errors;
				}
			} catch {}
		}
		const error = generateForChild(inter, {start}, 'content to be moved out from the table');
		errors.push({
			...error,
			startIndex: error.startIndex + 1,
			startLine: error.startLine + 1,
			startCol: 0,
			excerpt: error.excerpt.slice(1),
		});
		return errors;
	}

	/**
	 * @override
	 * @browser
	 */
	text() {
		this.#correct();
		const str = super.text();
		return this.type === 'tr' && !str.trim().includes('\n') ? '' : str;
	}

	/** 修复简单的表格语法错误 */
	#correct() {
		const {childNodes: [, , child]} = this;
		if (child?.constructor === Token) {
			const {firstChild} = child;
			if (firstChild?.type !== 'text') {
				child.prepend('\n');
			} else if (!firstChild.data.startsWith('\n')) {
				firstChild.insertData(0, '\n');
			}
		}
	}

	/** @override */
	toString(selector) {
		this.#correct();
		return super.toString(selector);
	}

	/**
	 * @override
	 * @param i 移除位置
	 */
	removeAt(i) {
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
	 * @param token 待插入的子节点
	 * @param i 插入位置
	 */
	insertAt(token, i = this.length) {
		if (!Parser.running && !(token instanceof TrBaseToken)) {
			this.typeError('insertAt', 'TrToken');
		}
		const child = this.childNodes.at(i);
		if (token instanceof TdToken && token.isIndependent() && child instanceof TdToken) {
			child.independence();
		}
		return super.insertAt(token, i);
	}

	/** 获取行数 */
	getRowCount() {
		return Number(this.childNodes.some(child => child instanceof TdToken && child.isIndependent() && !child.firstChild.text().endsWith('+')));
	}

	/** 获取列数 */
	getColCount() {
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

	/** @ignore */
	getNthCol(n, insert = false) {
		if (!Number.isInteger(n)) {
			this.typeError('getNthCol', 'Number');
		}
		const nCols = this.getColCount();
		let m = n < 0 ? n + nCols : n;
		if (m < 0 || m > nCols || m === nCols && !insert) {
			throw new RangeError(`不存在第 ${m} 个单元格！`);
		}
		let last = 0;
		for (const child of this.childNodes.slice(2)) {
			if (child instanceof TdToken) {
				if (child.isIndependent()) {
					last = Number(child.subtype !== 'caption');
				}
				m -= last;
				if (m < 0) {
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
	 * @param inner 单元格内部wikitext
	 * @param {TableCoords} coord 单元格坐标
	 * @param subtype 单元格类型
	 * @param attr 单元格属性
	 */
	insertTableCell(inner, {column}, subtype = 'td', attr = {}) {
		const token = TdToken.create(inner, subtype, attr, this.getAttribute('include'), this.getAttribute('config'));
		return this.insertBefore(token, this.getNthCol(column, true));
	}
}
Parser.classes.TrBaseToken = __filename;
module.exports = TrBaseToken;
