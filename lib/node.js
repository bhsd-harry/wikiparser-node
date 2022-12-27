'use strict';

const {print} = require('../util/string');

class AstNode {
	/** @type {(string|this)[]} */ childNodes = [];
	/** @type {this} */ #parentNode;

	get firstChild() {
		return this.childNodes[0];
	}
	get parentNode() {
		return this.#parentNode;
	}

	constructor() {
		Object.defineProperty(this, 'childNodes', {writable: false});
		Object.freeze(this.childNodes);
	}

	/** @param {PropertyKey} key */
	hasAttribute(key) {
		return key in this;
	}

	/**
	 * 除非用于私有属性，否则总是返回字符串
	 * @template {string} T
	 * @param {T} key
	 * @returns {TokenAttribute<T>}
	 */
	getAttribute(key) {
		return this.hasAttribute(key) ? String(this[key]) : undefined;
	}

	/**
	 * @template {string} T
	 * @param {T} key
	 * @param {TokenAttribute<T>} value
	 */
	setAttribute(key, value) {
		if (key === 'parentNode') {
			this.#parentNode = value;
		} else if (this.hasAttribute(key)) {
			const descriptor = Object.getOwnPropertyDescriptor(this, key),
				oldValue = this[key],
				frozen = oldValue !== null && typeof oldValue === 'object' && Object.isFrozen(oldValue);
			Object.defineProperty(this, key, {...descriptor, value});
			if (frozen && value !== null && typeof value === 'object') {
				Object.freeze(value);
			}
		} else {
			this[key] = value;
		}
		return this;
	}

	/** @complexity `n` */
	toString(separator = '') {
		return this.childNodes.map(String).join(separator);
	}

	/**
	 * @param {printOpt} opt
	 * @returns {string}
	 */
	print(opt = {}) {
		return `<span class="wpb-${opt.class ?? this.type}">${print(this.childNodes, opt)}</span>`;
	}

	/** @param {number} i */
	removeAt(i) {
		const childNodes = [...this.childNodes],
			[node] = childNodes.splice(i, 1);
		if (node instanceof AstNode) {
			node.setAttribute('parentNode');
		}
		this.setAttribute('childNodes', childNodes);
		return node;
	}

	/**
	 * @template {string|this} T
	 * @param {T} node
	 * @complexity `n`
	 */
	insertAt(node, i = this.childNodes.length) {
		const childNodes = [...this.childNodes];
		if (node instanceof AstNode) {
			node.setAttribute('parentNode', this);
		}
		childNodes.splice(i, 0, node);
		this.setAttribute('childNodes', childNodes);
		return node;
	}

	/**
	 * @template {string|this} T
	 * @param {T} node
	 * @complexity `n`
	 */
	appendChild(node) {
		return this.insertAt(node);
	}

	/** @param {string} str */
	setText(str, i = 0) {
		const oldText = this.childNodes.at(i),
			childNodes = [...this.childNodes];
		childNodes.splice(i, 1, str);
		this.setAttribute('childNodes', childNodes);
		return oldText;
	}

	/** @complexity `n` */
	normalize() {
		const childNodes = [...this.childNodes];
		for (let i = childNodes.length - 1; i >= 0; i--) {
			const str = childNodes[i];
			if (str === '') {
				childNodes.splice(i, 1);
			} else if (typeof str === 'string' && typeof childNodes[i - 1] === 'string') {
				childNodes[i - 1] += str;
				childNodes.splice(i, 1);
			}
		}
		this.setAttribute('childNodes', childNodes);
	}
}

module.exports = AstNode;
