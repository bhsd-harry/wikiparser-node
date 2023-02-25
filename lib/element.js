'use strict';

const {print} = require('../util/string'),
	AstNode = require('./node'),
	AstText = require('./text');

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
		this.childNodes.length = 0;
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
		for (let i = 0, cur = start + this.getPadding(); i < this.length; i++) {
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
		return String(this)
			? `<span class="wpb-${opt.class || this.type}">${print(this.childNodes, opt)}</span>`
			: '';
	}
}

module.exports = AstElement;
