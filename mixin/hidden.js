'use strict';

const Parser = require('..');

/**
 * 解析后不可见的类
 * @template T
 * @param {T} ct 基类
 * @returns {T}
 */
const hidden = ct => class extends ct {
	/** 没有可见部分 */
	text() { // eslint-disable-line class-methods-use-this
		return '';
	}
};

Parser.mixins.hidden = __filename;
module.exports = hidden;
