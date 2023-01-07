'use strict';

const Parser = require('..'),
	Token = require('../src');

/**
 * 不可增删子节点的类
 * @template T
 * @param {T} Constructor 基类
 * @returns {T}
 */
const fixedToken = Constructor => class extends Constructor {
	static fixed = true;

	/**
	 * 移除子节点
	 * @throws `Error`
	 */
	removeAt() {
		throw new Error(`${this.constructor.name} 不可删除元素！`);
	}

	/**
	 * 插入子节点
	 * @template {Token} T
	 * @param {T} token 待插入的子节点
	 * @param {number} i 插入位置
	 * @throws `Error`
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
