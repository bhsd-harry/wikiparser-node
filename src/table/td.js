'use strict';
const lint_1 = require('../../util/lint');
const {generateForChild} = lint_1;
const fixed = require('../../mixin/fixed');
const debug_1 = require('../../util/debug');
const {typeError} = debug_1;
const base_1 = require('../../util/base');
const {isPlainObject} = base_1;
const Parser = require('../../index');
const Token = require('..');
const TableBaseToken = require('./base');

/**
 * `<td>`、`<th>`和`<caption>`
 * @classdesc `{childNodes: [SyntaxToken, AttributesToken, Token]}`
 */
class TdToken extends fixed(TableBaseToken) {
	/** @browser */
	type = 'td';
	/** @browser */
	#innerSyntax = '';

	/**
	 * 单元格类型
	 * @browser
	 */
	get subtype() {
		return this.getSyntax().subtype;
	}

	set subtype(subtype) {
		this.setSyntax(subtype);
	}

	/** rowspan */
	get rowspan() {
		return this.getAttr('rowspan');
	}

	set rowspan(rowspan) {
		this.setAttr('rowspan', rowspan);
	}

	/** colspan */
	get colspan() {
		return this.getAttr('colspan');
	}

	set colspan(colspan) {
		this.setAttr('colspan', colspan);
	}

	/** 内部wikitext */
	get innerText() {
		return this.lastChild.text();
	}

	/**
	 * @browser
	 * @param syntax 单元格语法
	 * @param inner 内部wikitext
	 */
	constructor(syntax, inner, config = Parser.getConfig(), accum = []) {
		let innerSyntax = inner?.match(/\||\0\d+!\x7F/u),
			attr = innerSyntax ? inner.slice(0, innerSyntax.index) : '';
		if (/\[\[|-\{/u.test(attr)) {
			innerSyntax = undefined;
			attr = '';
		}
		super(/^(?:\n[^\S\n]*(?:[|!]|\|\+|\{\{\s*!\s*\}\}\+?)|(?:\||\{\{\s*!\s*\}\}){2}|!!|\{\{\s*!!\s*\}\})$/u, syntax, attr, config, accum, {SyntaxToken: 0, AttributesToken: 1, Token: 2});
		if (innerSyntax) {
			[this.#innerSyntax] = innerSyntax;
		}
		const innerToken = new Token(inner?.slice((innerSyntax?.index ?? NaN) + this.#innerSyntax.length), config, true, accum);
		innerToken.type = 'td-inner';
		this.insertAt(innerToken.setAttribute('stage', 4));
	}

	/** @private */
	getSyntax() {
		const syntax = this.firstChild.text(),
			esc = syntax.includes('{{'),
			char = syntax.at(-1);
		let subtype = 'td';
		if (char === '!') {
			subtype = 'th';
		} else if (char === '+') {
			subtype = 'caption';
		}
		if (this.isIndependent()) {
			return {subtype, escape: esc, correction: false};
		}
		const {previousSibling} = this;
		if (previousSibling?.type !== 'td') {
			return {subtype, escape: esc, correction: true};
		}
		const result = previousSibling.getSyntax();
		result.escape ||= esc;
		result.correction = previousSibling.lastChild
			.toString('comment, ext, include, noinclude, arg, template, magic-word')
			.includes('\n');
		if (subtype === 'th' && result.subtype !== 'th') {
			result.subtype = 'th';
			result.correction = true;
		}
		return result;
	}

	/** @private */
	afterBuild() {
		if (this.#innerSyntax.includes('\0')) {
			this.#innerSyntax = this.buildFromStr(this.#innerSyntax, 'string');
		}
	}

	/**
	 * @override
	 * @browser
	 */
	toString(selector) {
		this.#correct();
		const {childNodes: [syntax, attr, inner]} = this;
		return selector && this.matches(selector)
			? ''
			: `${syntax.toString(selector)}${attr.toString(selector)}${this.#innerSyntax}${inner.toString(selector)}`;
	}

	/**
	 * @override
	 * @browser
	 */
	text() {
		this.#correct();
		const {childNodes: [syntax, attr, inner]} = this;
		return `${syntax.text()}${attr.text()}${this.#innerSyntax}${inner.text()}`;
	}

	/** @private */
	getGaps(i = 0) {
		const j = i < 0 ? i + this.length : i;
		if (j === 1) {
			this.#correct();
			return this.#innerSyntax.length;
		}
		return 0;
	}

	/**
	 * @override
	 * @browser
	 */
	lint(start = this.getAbsoluteIndex()) {
		const errors = super.lint(start),
			newStart = start + this.getRelativeIndex(-1);
		for (const child of this.lastChild.childNodes) {
			if (child.type === 'text' && child.data.includes('|')) {
				errors.push(generateForChild(child, {start: newStart}, 'additional "|" in a table cell', 'warning'));
			}
		}
		return errors;
	}

	/**
	 * @override
	 * @browser
	 */
	print() {
		const {childNodes: [syntax, attr, inner]} = this;
		return `<span class="wpb-td">${syntax.print()}${attr.print()}${this.#innerSyntax}${inner.print()}</span>`;
	}

	/** 是否位于行首 */
	isIndependent() {
		return this.firstChild.text().startsWith('\n');
	}

	/** @override */
	cloneNode() {
		const token = super.cloneNode();
		token.setAttribute('innerSyntax', this.#innerSyntax);
		return token;
	}

	/** @private */
	getAttribute(key) {
		return key === 'innerSyntax' ? this.#innerSyntax : super.getAttribute(key);
	}

	/** @private */
	setAttribute(key, value) {
		if (key === 'innerSyntax') {
			this.#innerSyntax = value ?? '';
			return this;
		}
		return super.setAttribute(key, value);
	}

	/**
	 * @override
	 * @param syntax 表格语法
	 * @param esc 是否需要转义
	 */
	setSyntax(syntax, esc = false) {
		const aliases = {td: '\n|', th: '\n!', caption: '\n|+'};
		super.setSyntax(aliases[syntax] ?? syntax, esc);
	}

	/** 修复\<td\>语法 */
	#correct() {
		if (String(this.childNodes[1])) {
			this.#innerSyntax ||= '|';
		}
		const {subtype, escape, correction} = this.getSyntax();
		if (correction) {
			this.setSyntax(subtype, escape);
		}
	}

	/** 改为独占一行 */
	independence() {
		if (!this.isIndependent()) {
			const {subtype, escape} = this.getSyntax();
			this.setSyntax(subtype, escape);
		}
	}

	/**
	 * @override
	 * @param key 属性键
	 */
	getAttr(key) {
		const value = super.getAttr(key),
			lcKey = key.toLowerCase().trim();
		return lcKey === 'rowspan' || lcKey === 'colspan'
			? Number(value) || 1
			: value;
	}

	/** @override */
	getAttrs() {
		const attr = super.getAttrs();
		if ('rowspan' in attr) {
			attr.rowspan = Number(attr.rowspan);
		}
		if ('colspan' in attr) {
			attr.colspan = Number(attr.colspan);
		}
		return attr;
	}

	/**
	 * @override
	 * @param key 属性键
	 * @param value 属性值
	 */
	setAttr(key, value) {
		if (typeof key !== 'string') {
			this.typeError('setAttr', 'String');
		}
		const lcKey = key.toLowerCase().trim();
		let v;
		if (typeof value === 'number' && (lcKey === 'rowspan' || lcKey === 'colspan')) {
			v = value === 1 ? false : String(value);
		} else {
			v = value;
		}
		super.setAttr(lcKey, v);
		if (!String(this.childNodes[1])) {
			this.#innerSyntax = '';
		}
	}

	/** @override */
	escape() {
		super.escape();
		if (String(this.childNodes[1])) {
			this.#innerSyntax ||= '{{!}}';
		}
		if (this.#innerSyntax === '|') {
			this.#innerSyntax = '{{!}}';
		}
	}

	/**
	 * 创建新的单元格
	 * @param inner 内部wikitext
	 * @param subtype 单元格类型
	 * @param attr 单元格属性
	 * @param include 是否嵌入
	 * @throws `RangeError` 非法的单元格类型
	 */
	static create(inner, subtype = 'td', attr = {}, include = false, config = Parser.getConfig()) {
		if (typeof inner !== 'string' && inner?.constructor !== Token || !isPlainObject(attr)) {
			typeError(this, 'create', 'String', 'Token', 'Object');
		} else if (subtype !== 'td' && subtype !== 'th' && subtype !== 'caption') {
			throw new RangeError('单元格的子类型只能为 "td"、"th" 或 "caption"！');
		}
		const innerToken = typeof inner === 'string' ? Parser.parse(inner, include, undefined, config) : inner,
			token = Parser.run(() => new TdToken('\n|', undefined, config));
		token.setSyntax(subtype);
		token.lastChild.safeReplaceWith(innerToken);
		for (const [k, v] of Object.entries(attr)) {
			token.setAttr(k, v);
		}
		return token;
	}
}
Parser.classes.TdToken = __filename;
module.exports = TdToken;
