'use strict';

const AstNode = require('./node'),
	AstText = require('./text');

/** 类似HTMLElement */
class AstElement extends AstNode {
	/** @type {string} */ name;

	/** 子节点总数 */
	get length() {
		return this.childNodes.length;
	}

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
		const {children} = this;
		return children[children.length - 1];
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
		const /** @type {AstText} */ oldText = this.childNodes[i],
			{type, data} = oldText;
		if (type === 'text') {
			oldText.replaceData(str);
			return data;
		}
		return undefined;
	}

	/**
	 * 还原为wikitext
	 * @param {string} separator 子节点间的连接符
	 * @returns {string}
	 */
	toString(selector, separator = '') {
		return this.childNodes.map(child => child.toString()).join(separator);
	}

	static lintIgnoredExt = new Set([
		'nowiki',
		'pre',
		'charinsert',
		'score',
		'syntaxhighlight',
		'source',
		'math',
		'chem',
		'ce',
		'graph',
		'mapframe',
		'maplink',
		'quiz',
		'templatedata',
		'timeline',
	]);

	/**
	 * Linter
	 * @param {number} start 起始位置
	 */
	lint(start = 0) {
		const SyntaxToken = require('../src/syntax');
		if (this instanceof SyntaxToken || this.constructor.hidden
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
}

module.exports = AstElement;
