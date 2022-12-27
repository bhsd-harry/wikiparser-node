'use strict';

const AstNode = require('./node');

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
}

module.exports = AstElement;
