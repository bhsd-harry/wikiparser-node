'use strict';
const Parser = require('../index');

/**
 * 不可增删子节点的类
 * @param constructor 基类
 */
const fixed = constructor => {
	/** 不可增删子节点的类 */
	class FixedToken extends constructor {
		static fixed = true;

		/**
		 * @override
		 * @throws `Error`
		 */
		removeAt() {
			throw new Error(`${this.constructor.name} 不可删除元素！`);
		}

		/** @ignore */
		insertAt(token, i = this.length) {
			if (Parser.running) {
				return super.insertAt(token, i);
			}
			throw new Error(`${this.constructor.name} 不可插入元素！`);
		}
	}
	return FixedToken;
};
Parser.mixins.fixed = __filename;
module.exports = fixed;
