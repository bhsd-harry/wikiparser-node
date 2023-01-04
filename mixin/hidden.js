'use strict';

const Parser = require('..');

/**
 * 解析后不可见的类
 * @template T
 * @param {T} Constructor 基类
 * @returns {T}
 */
const hidden = Constructor => class extends Constructor {
	/** 没有可见部分 */
	text() { // eslint-disable-line class-methods-use-this
		return '';
	}
};

Parser.mixins.hidden = __filename;
module.exports = hidden;
