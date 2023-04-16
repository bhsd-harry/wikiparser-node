'use strict';

/**
 * 解析后不可见的类
 * @template {new (...args: any) => import('../src')} T
 * @param {T} Constructor 基类
 * @returns {T}
 */
const hidden = Constructor => class extends Constructor {
	static hidden = true;

	/** 没有可见部分 */
	text() { // eslint-disable-line class-methods-use-this
		return '';
	}
};

module.exports = hidden;
