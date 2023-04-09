'use strict';

/** @typedef {import('../src')} Token */

const Parser = require('..');

/**
 * 不可增删子节点的类
 * @template {new (...args: any) => Token} T
 * @param {T} Constructor 基类
 * @returns {T}
 */
const fixedToken = Constructor => class extends Constructor {
	static fixed = true;

	/**
	 * @override
	 * @returns {never}
	 * @throws `Error`
	 */
	removeAt() {
		throw new Error(`${this.constructor.name} 不可删除元素！`);
	}

	/**
	 * @override
	 * @template {string|import('../lib/text')|Token} T
	 * @param {T} token 待插入的子节点
	 * @param {number} i 插入位置
	 * @throws `Error`
	 */
	insertAt(token, i = this.length) {
		if (Parser.running) {
			return super.insertAt(token, i);
		}
		throw new Error(`${this.constructor.name} 不可插入元素！`);
	}
};

Parser.mixins.fixedToken = __filename;
module.exports = fixedToken;
