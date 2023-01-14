'use strict';

const {print} = require('../util/string'),
	AstNode = require('./node'),
	AstText = require('./text');

/** 类似HTMLElement */
class AstElement extends AstNode {
	/** @type {string} */ name;

	/**
	 * 全部非文本子节点
	 * @complexity `n`
	 */
	get children() {
		const /** @type {this[]} */ children = this.childNodes.filter(({type}) => type !== 'text');
		return children;
	}

	/**
	 * 首位非文本子节点
	 * @returns {this}
	 */
	get firstElementChild() {
		return this.childNodes.find(({type}) => type !== 'text');
	}

	/**
	 * 末位非文本子节点
	 * @complexity `n`
	 */
	get lastElementChild() {
		return this.children.at(-1);
	}

	/**
	 * 在末尾批量插入子节点
	 * @param {...this} elements 插入节点
	 * @complexity `n`
	 */
	append(...elements) {
		for (const element of elements) {
			this.insertAt(element);
		}
	}

	/**
	 * 批量替换子节点
	 * @param {...this} elements 新的子节点
	 * @complexity `n`
	 */
	replaceChildren(...elements) {
		for (let i = this.childNodes.length - 1; i >= 0; i--) {
			this.removeAt(i);
		}
		this.append(...elements);
	}

	/**
	 * 修改文本子节点
	 * @param {string} str 新文本
	 * @param {number} i 子节点位置
	 */
	setText(str, i = 0) {
		const /** @type {AstText} */ oldText = this.childNodes.at(i),
			{data} = oldText;
		oldText.replaceData(str);
		return data;
	}

	/**
	 * 还原为wikitext
	 * @param {string} separator 子节点间的连接符
	 */
	toString(separator = '') {
		return this.childNodes.map(child => child.toString()).join(separator);
	}

	static lintIgnoredHidden = new Set(['noinclude', 'double-underscore', 'hidden']);
	static lintIgnoredSyntax = new Set(['magic-word-name', 'heading-trail', 'table-syntax']);
	static lintIgnoredExt = new Set(['nowiki', 'pre', 'syntaxhighlight', 'source', 'math', 'timeline']);

	/**
	 * Linter
	 * @param {number} start 起始位置
	 */
	lint(start = 0) {
		if (AstElement.lintIgnoredHidden.has(this.type) || AstElement.lintIgnoredSyntax.has(this.type)
			|| this.type === 'ext-inner' && AstElement.lintIgnoredExt.has(this.name)
		) {
			return [];
		}
		const /** @type {LintError[]} */ errors = [];
		for (let i = 0, cur = start + this.getPadding(); i < this.childNodes.length; i++) {
			const child = this.childNodes[i];
			errors.push(...child.lint(cur));
			cur += String(child).length + this.getGaps(i);
		}
		return errors;
	}

	/**
	 * 以HTML格式打印
	 * @param {printOpt} opt 选项
	 * @returns {string}
	 */
	print(opt = {}) {
		return this.childNodes.length === 0
			? ''
			: `<span class="wpb-${opt.class ?? this.type}">${print(this.childNodes, opt)}</span>`;
	}
}

module.exports = AstElement;
