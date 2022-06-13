'use strict';

const {externalUse} = require('../util/debug'),
	/** @type {Parser} */ Parser = require('..');

/**
 * @template T
 * @param {T} constructor
 * @returns {T}
 */
const fixedToken = constructor => class extends constructor {
	removeAt() {
		throw new Error(`${this.constructor.name} 不可删除元素！`);
	}

	/**
	 * @template {string|Token} T
	 * @param {T} token
	 * @param {number} i
	 */
	insertAt(token, i = this.childNodes.length) {
		if (externalUse(this.constructor.name, true)) {
			throw new Error(`${this.constructor.name} 不可插入元素！`);
		}
		super.insertAt(token, i);
		return token;
	}
};

Parser.mixins.fixedToken = __filename;
module.exports = fixedToken;
