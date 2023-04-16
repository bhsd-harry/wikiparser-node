'use strict';

/** @typedef {import('./text')} AstText */
/** @typedef {import('../src')} Token */

const AstNode = require('./node');

const lintIgnoredExt = new Set([
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

/** 类似HTMLElement */
class AstElement extends AstNode {
	/** @type {string} */ name;

	/** 子节点总数 */
	get length() {
		return this.childNodes.length;
	}

	/**
	 * 最近的祖先节点
	 * @param {string} selector
	 */
	closest(selector) {
		const types = new Set(selector.split(',').map(type => type.trim()));
		let {parentNode} = this;
		while (parentNode) {
			if (types.has(parentNode.type)) {
				return parentNode;
			}
			({parentNode} = parentNode);
		}
		return undefined;
	}

	/**
	 * 在末尾批量插入子节点
	 * @this {Token}
	 * @param {...(AstText|Token)} elements 插入节点
	 * @complexity `n`
	 */
	append(...elements) {
		for (const element of elements) {
			this.insertAt(element);
		}
	}

	/**
	 * 批量替换子节点
	 * @this {Token}
	 * @param {...(AstText|Token)} elements 新的子节点
	 * @complexity `n`
	 */
	replaceChildren(...elements) {
		this.childNodes.length = 0;
		this.append(...elements);
	}

	/**
	 * 修改文本子节点
	 * @param {string} str 新文本
	 * @param {number} i 子节点位置
	 */
	setText(str, i = 0) {
		const oldText = /** @type {AstText} */ (this.childNodes.at(i)),
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
	 */
	toString(selector = undefined, separator = '') {
		return this.childNodes.map(child => child.toString()).join(separator);
	}

	/**
	 * Linter
	 * @this {this & {constructor: {hidden?: boolean}}}
	 * @param {number} start 起始位置
	 */
	lint(start = 0) {
		const SyntaxToken = require('../src/syntax');
		if (this instanceof SyntaxToken || this.constructor.hidden
			|| this.type === 'ext-inner' && lintIgnoredExt.has(this.name)
		) {
			return [];
		}
		const /** @type {import('..').LintError[]} */ errors = [];
		for (let i = 0, cur = start + this.getPadding(); i < this.length; i++) {
			const child = this.childNodes[i];
			errors.push(...child.lint(cur));
			cur += String(child).length + this.getGaps(i);
		}
		return errors;
	}
}

module.exports = AstElement;
