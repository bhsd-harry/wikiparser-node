'use strict';

const AstNode = require('./node'),
	/** @type {Parser} */ Parser = require('..');

class AstElement extends AstNode {
	/** @type {string} */ type;
	/** @type {string} */ name;

	/** @complexity `n` */
	get children() {
		const /** @type {this[]} */ children = this.childNodes.filter(ele => ele instanceof AstElement);
		return children;
	}
	/** @returns {this} */
	get firstElementChild() {
		return this.childNodes.find(ele => ele instanceof AstElement);
	}
	/** @complexity `n` */
	get lastElementChild() {
		return this.children.at(-1);
	}
	get parentElement() {
		return this.parentNode;
	}

	/**
	 * @param {...string|this} elements
	 * @complexity `n`
	 */
	append(...elements) {
		for (const element of elements) {
			this.appendChild(element);
		}
	}

	/**
	 * @param {...string|this} elements
	 * @complexity `n`
	 */
	replaceChildren(...elements) {
		for (let i = this.childNodes.length - 1; i >= 0; i--) {
			this.removeAt(i);
		}
		this.append(...elements);
	}

	/**
	 * @param {(string|this)[]} elements
	 * @param {number} offset
	 * @complexity `n`
	 */
	#insertAdjacent(elements, offset) {
		const {parentNode} = this,
			i = parentNode.childNodes.indexOf(this) + offset;
		for (const [j, element] of elements.entries()) {
			parentNode.insertAt(element, i + j);
		}
	}

	/**
	 * @param {...string|this} elements
	 * @complexity `n`
	 */
	after(...elements) {
		this.#insertAdjacent(elements, 1);
	}

	/** @complexity `n` */
	remove() {
		this.parentNode.removeChild(this);
	}

	/**
	 * @param {...string|this} elements
	 * @complexity `n`
	 */
	replaceWith(...elements) {
		this.after(...elements);
		this.remove();
	}

	/**
	 * @returns {boolean}
	 * @complexity `n`
	 */
	matches(selector = '', simple = false) {
		if (!selector.trim()) {
			return true;
		}
		if (!simple && selector.includes(',')) {
			return Parser.run(() => selector.split(',').some(str => this.matches(str, true)));
		}
		const [type, ...parts] = selector.trim().split('#'),
			name = parts.join('#');
		return (!type || this.type === type) && (!name || this.name === name);
	}

	closest(selector = '') {
		let {parentElement} = this;
		while (parentElement) {
			if (parentElement.matches(selector)) {
				return parentElement;
			}
			({parentElement} = parentElement);
		}
	}
}

module.exports = AstElement;
