'use strict';

/**
 * 解析后不可见的类
 * @template T
 * @param {T} Constructor 基类
 * @returns {T}
 */
const hidden = Constructor => class extends Constructor {
	static hidden = true;
};

module.exports = hidden;
