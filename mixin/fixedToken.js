'use strict';

const /** @type {Parser} */ Parser = require('..');

/**
 * @template T
 * @param {T} constructor
 * @returns {T}
 */
const fixedToken = ct => class extends ct {
	static fixed = true;

	removeAt() {
		throw new Error(`${this.constructor.name} 不可删除元素！`);
	}

	/**
	 * @template {string|Token} T
	 * @param {T} token
	 * @param {number} i
	 */
	insertAt(token, i = this.childNodes.length) {
		if (!Parser.running) {
			throw new Error(`${this.constructor.name} 不可插入元素！`);
		}
		super.insertAt(token, i);
		return token;
	}
};

Parser.mixins.fixedToken = __filename;
module.exports = fixedToken;
